<script lang="ts">
	import type { CropRect, SourceInfo } from '../engine';

	interface Props {
		previewDataUrl: string | null;
		source: SourceInfo | null;
		crop: CropRect | null;
		rotate: number;
		flipH: boolean;
		flipV: boolean;
		onDrop: (file: File) => void;
	}

	let {
		previewDataUrl,
		source,
		crop = $bindable(),
		rotate,
		flipH,
		flipV,
		onDrop,
	}: Props = $props();

	type Corner = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

	type DragMode =
		| { kind: 'create'; startX: number; startY: number; endX: number; endY: number }
		| { kind: 'move'; startX: number; startY: number; orig: CropRect }
		| {
				kind: 'resize';
				corner: Corner;
				startX: number;
				startY: number;
				orig: CropRect;
		  };

	/** Hit-test radius (in image-local px) around handles. */
	const HANDLE_HIT = 10;

	let imgEl = $state<HTMLImageElement | null>(null);
	let containerEl = $state<HTMLDivElement | null>(null);
	let dragOver = $state(false);
	let dragMode = $state<DragMode | null>(null);
	let hoverCursor = $state('crosshair');

	/**
	 * The image's UNTRANSFORMED layout box, and where its centre sits on screen.
	 *
	 * Rotation and flipping happen in CSS on the wrapper (see `transform` below),
	 * which is what keeps the angle slider smooth. Everything in this component
	 * therefore works in the image's own unrotated coordinate space, and pointer
	 * positions are mapped back into it by `toLocal`. The crop rectangle lives in
	 * source pixels, which the pipeline crops BEFORE it rotates, so unrotated
	 * space is the correct frame to reason in.
	 */
	let box = $state<{ w: number; h: number; cx: number; cy: number } | null>(null);
	/** Container size, used to shrink the rotated image back inside its frame. */
	let frame = $state<{ w: number; h: number } | null>(null);

	$effect(() => {
		const img = imgEl;
		const container = containerEl;
		if (!img || !container) {
			box = null;
			frame = null;
			return;
		}
		const update = () => {
			// getBoundingClientRect() returns the TRANSFORMED box, but rotating and
			// scaling about the centre leaves the centre where it was, so its centre
			// is still the right anchor. The untransformed size comes from layout.
			const rect = img.getBoundingClientRect();
			box = {
				w: img.offsetWidth,
				h: img.offsetHeight,
				cx: rect.left + rect.width / 2,
				cy: rect.top + rect.height / 2,
			};
			frame = { w: container.clientWidth, h: container.clientHeight };
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(img);
		ro.observe(container);
		window.addEventListener('scroll', update, true);
		window.addEventListener('resize', update);
		return () => {
			ro.disconnect();
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		};
	});

	const radians = $derived((rotate * Math.PI) / 180);

	/**
	 * How much to shrink the rotated image so its corners stay inside the frame.
	 * A 45°-rotated wide image needs noticeably more room than an upright one.
	 */
	const fit = $derived.by(() => {
		if (!box || !frame || box.w === 0 || box.h === 0) {
			return 1;
		}
		const cos = Math.abs(Math.cos(radians));
		const sin = Math.abs(Math.sin(radians));
		const bboxW = box.w * cos + box.h * sin;
		const bboxH = box.w * sin + box.h * cos;
		if (bboxW === 0 || bboxH === 0) {
			return 1;
		}
		return Math.min(1, frame.w / bboxW, frame.h / bboxH);
	});

	// Rightmost transform applies first: flip the pixels, then rotate, then fit.
	const transform = $derived(
		`scale(${fit}) rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
	);

	/** Viewport point → the image's own unrotated coordinate space. */
	function toLocal(clientX: number, clientY: number): { x: number; y: number } | null {
		if (!box) {
			return null;
		}
		let dx = (clientX - box.cx) / fit;
		let dy = (clientY - box.cy) / fit;

		// Undo the rotation, then the flips, in the reverse of the CSS order.
		const cos = Math.cos(-radians);
		const sin = Math.sin(-radians);
		[dx, dy] = [dx * cos - dy * sin, dx * sin + dy * cos];
		if (flipH) {
			dx = -dx;
		}
		if (flipV) {
			dy = -dy;
		}
		return { x: dx + box.w / 2, y: dy + box.h / 2 };
	}

	function clampInt(n: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, Math.round(n)));
	}

	function localToSource(x: number, y: number): { x: number; y: number } | null {
		if (!source || !box || box.w === 0 || box.h === 0) {
			return null;
		}
		return {
			x: clampInt((x * source.width) / box.w, 0, source.width),
			y: clampInt((y * source.height) / box.h, 0, source.height),
		};
	}

	type Display = { left: number; top: number; width: number; height: number };

	function sourceToDisplay(rect: CropRect): Display | null {
		if (!source || !box || box.w === 0 || box.h === 0) {
			return null;
		}
		const ratioX = box.w / source.width;
		const ratioY = box.h / source.height;
		return {
			left: rect.x * ratioX,
			top: rect.y * ratioY,
			width: rect.w * ratioX,
			height: rect.h * ratioY,
		};
	}

	function hitTestHandle(x: number, y: number, d: Display): Corner | null {
		const right = d.left + d.width;
		const bottom = d.top + d.height;
		const cx = d.left + d.width / 2;
		const cy = d.top + d.height / 2;
		// The image may be scaled down to fit; keep the grab radius constant on
		// screen by widening it in local space by the same factor.
		const slop = HANDLE_HIT / fit;
		const near = (px: number, py: number) =>
			Math.abs(x - px) <= slop && Math.abs(y - py) <= slop;
		if (near(d.left, d.top)) return 'nw';
		if (near(right, d.top)) return 'ne';
		if (near(d.left, bottom)) return 'sw';
		if (near(right, bottom)) return 'se';
		if (near(cx, d.top)) return 'n';
		if (near(cx, bottom)) return 's';
		if (near(d.left, cy)) return 'w';
		if (near(right, cy)) return 'e';
		return null;
	}

	function isInsideCrop(x: number, y: number, d: Display): boolean {
		return (
			x > d.left && x < d.left + d.width && y > d.top && y < d.top + d.height
		);
	}

	function cursorForCorner(c: Corner): string {
		switch (c) {
			case 'nw':
			case 'se':
				return 'nwse-resize';
			case 'ne':
			case 'sw':
				return 'nesw-resize';
			case 'n':
			case 's':
				return 'ns-resize';
			case 'e':
			case 'w':
				return 'ew-resize';
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (!source || event.button !== 0) {
			return;
		}
		const p = toLocal(event.clientX, event.clientY);
		if (!p) {
			return;
		}
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

		// With a crop already set, the pointer moves or resizes it when it lands on
		// the box. Anywhere else starts a fresh selection.
		if (crop) {
			const display = sourceToDisplay(crop);
			if (display) {
				const handle = hitTestHandle(p.x, p.y, display);
				if (handle) {
					dragMode = {
						kind: 'resize',
						corner: handle,
						startX: p.x,
						startY: p.y,
						orig: { ...crop },
					};
					return;
				}
				if (isInsideCrop(p.x, p.y, display)) {
					dragMode = { kind: 'move', startX: p.x, startY: p.y, orig: { ...crop } };
					return;
				}
			}
		}
		dragMode = { kind: 'create', startX: p.x, startY: p.y, endX: p.x, endY: p.y };
	}

	function handlePointerMove(event: PointerEvent) {
		const raw = toLocal(event.clientX, event.clientY);
		if (!raw || !box) {
			return;
		}
		const x = Math.max(0, Math.min(box.w, raw.x));
		const y = Math.max(0, Math.min(box.h, raw.y));

		if (!dragMode) {
			// Hover cursor advertises the handles and the move region.
			const display = crop ? sourceToDisplay(crop) : null;
			if (display) {
				const handle = hitTestHandle(x, y, display);
				if (handle) {
					hoverCursor = cursorForCorner(handle);
					return;
				}
				if (isInsideCrop(x, y, display)) {
					hoverCursor = 'move';
					return;
				}
			}
			hoverCursor = 'crosshair';
			return;
		}

		if (dragMode.kind === 'create') {
			dragMode = { ...dragMode, endX: x, endY: y };
		} else if (dragMode.kind === 'move') {
			applyMove(x, y, dragMode);
		} else {
			applyResize(x, y, dragMode);
		}
	}

	function handlePointerUp(event: PointerEvent) {
		if (!dragMode) {
			return;
		}
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);

		if (dragMode.kind === 'create') {
			const sel = dragMode;
			dragMode = null;
			const dx = Math.abs(sel.endX - sel.startX);
			const dy = Math.abs(sel.endY - sel.startY);
			if (dx < 5 || dy < 5) {
				// A tiny drag is a click: clear any existing crop.
				crop = null;
				return;
			}
			const minX = Math.min(sel.startX, sel.endX);
			const minY = Math.min(sel.startY, sel.endY);
			const a = localToSource(minX, minY);
			const b = localToSource(minX + dx, minY + dy);
			if (!a || !b) {
				return;
			}
			crop = { x: a.x, y: a.y, w: Math.max(1, b.x - a.x), h: Math.max(1, b.y - a.y) };
			return;
		}

		// move and resize already updated the crop as they went.
		dragMode = null;
	}

	function applyMove(
		x: number,
		y: number,
		mode: Extract<DragMode, { kind: 'move' }>,
	) {
		if (!source || !box) {
			return;
		}
		const dxSrc = ((x - mode.startX) * source.width) / box.w;
		const dySrc = ((y - mode.startY) * source.height) / box.h;
		crop = {
			x: clampInt(mode.orig.x + dxSrc, 0, source.width - mode.orig.w),
			y: clampInt(mode.orig.y + dySrc, 0, source.height - mode.orig.h),
			w: mode.orig.w,
			h: mode.orig.h,
		};
	}

	function applyResize(
		x: number,
		y: number,
		mode: Extract<DragMode, { kind: 'resize' }>,
	) {
		if (!source || !box) {
			return;
		}
		const dxSrc = ((x - mode.startX) * source.width) / box.w;
		const dySrc = ((y - mode.startY) * source.height) / box.h;

		let { x: nx, y: ny, w: nw, h: nh } = mode.orig;
		const right = mode.orig.x + mode.orig.w;
		const bottom = mode.orig.y + mode.orig.h;
		const c = mode.corner;

		if (c === 'nw' || c === 'w' || c === 'sw') {
			// Left edge moves; right edge stays put.
			nx = clampInt(mode.orig.x + dxSrc, 0, right - 1);
			nw = right - nx;
		}
		if (c === 'ne' || c === 'e' || c === 'se') {
			// Right edge moves; left edge stays put.
			nw = clampInt(mode.orig.w + dxSrc, 1, source.width - mode.orig.x);
		}
		if (c === 'nw' || c === 'n' || c === 'ne') {
			// Top edge moves; bottom edge stays put.
			ny = clampInt(mode.orig.y + dySrc, 0, bottom - 1);
			nh = bottom - ny;
		}
		if (c === 'sw' || c === 's' || c === 'se') {
			// Bottom edge moves; top edge stays put.
			nh = clampInt(mode.orig.h + dySrc, 1, source.height - mode.orig.y);
		}

		crop = { x: nx, y: ny, w: nw, h: nh };
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleDragLeave(event: DragEvent) {
		if (event.target === containerEl) {
			dragOver = false;
		}
	}

	function handleDropEvent(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) {
			onDrop(file);
		}
	}

	const dragRectStyle = $derived.by((): string | null => {
		if (!dragMode || dragMode.kind !== 'create') {
			return null;
		}
		const left = Math.min(dragMode.startX, dragMode.endX);
		const top = Math.min(dragMode.startY, dragMode.endY);
		const width = Math.abs(dragMode.endX - dragMode.startX);
		const height = Math.abs(dragMode.endY - dragMode.startY);
		return `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
	});

	const cropDisplay = $derived(crop ? sourceToDisplay(crop) : null);

	const cropRectStyle = $derived(
		cropDisplay
			? `left:${cropDisplay.left}px;top:${cropDisplay.top}px;width:${cropDisplay.width}px;height:${cropDisplay.height}px`
			: null,
	);

	const handles = $derived.by(() => {
		const d = cropDisplay;
		if (!d) {
			return [] as { corner: Corner; x: number; y: number }[];
		}
		const cx = d.left + d.width / 2;
		const cy = d.top + d.height / 2;
		const right = d.left + d.width;
		const bottom = d.top + d.height;
		return [
			{ corner: 'nw' as Corner, x: d.left, y: d.top },
			{ corner: 'n' as Corner, x: cx, y: d.top },
			{ corner: 'ne' as Corner, x: right, y: d.top },
			{ corner: 'e' as Corner, x: right, y: cy },
			{ corner: 'se' as Corner, x: right, y: bottom },
			{ corner: 's' as Corner, x: cx, y: bottom },
			{ corner: 'sw' as Corner, x: d.left, y: bottom },
			{ corner: 'w' as Corner, x: d.left, y: cy },
		];
	});
</script>

<div
	bind:this={containerEl}
	class="im-canvas"
	class:im-dragover={dragOver}
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDropEvent}
	role="region"
	aria-label="Image preview"
>
	{#if previewDataUrl && source}
		<!--
			Rotation and flipping live here, in CSS, not in the engine. The crop
			overlays sit inside the same transformed wrapper, so they ride along with
			the image and keep pointing at the same pixels.
		-->
		<div class="im-canvas-inner" style="transform:{transform}">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<img
				bind:this={imgEl}
				src={previewDataUrl}
				alt={source.name}
				draggable="false"
				style="cursor:{hoverCursor}"
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
			/>

			{#if cropRectStyle}
				<div class="im-crop-box" style={cropRectStyle}></div>
				{#each handles as h (h.corner)}
					<div class="im-crop-handle" style="left:{h.x}px;top:{h.y}px"></div>
				{/each}
			{/if}
			{#if dragRectStyle}
				<div class="im-crop-draft" style={dragRectStyle}></div>
			{/if}
		</div>
	{:else}
		<div class="im-dropzone">
			<span>Drop an image here</span>
			<span class="im-hint">PNG · JPG · WebP · AVIF · GIF · TIFF · BMP</span>
		</div>
	{/if}
</div>
