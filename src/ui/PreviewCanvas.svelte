<script lang="ts">
	import type { CropRect, SourceInfo } from '../engine';

	interface Props {
		previewDataUrl: string | null;
		source: SourceInfo | null;
		crop: CropRect | null;
		busy: boolean;
		onDrop: (file: File) => void;
	}

	let {
		previewDataUrl,
		source,
		crop = $bindable(),
		busy,
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

	/** Hit-test radius (in display px) around handles. */
	const HANDLE_HIT = 10;

	let imgEl = $state<HTMLImageElement | null>(null);
	let containerEl = $state<HTMLDivElement | null>(null);
	let dragOver = $state(false);
	let imgRect = $state<DOMRect | null>(null);
	let dragMode = $state<DragMode | null>(null);
	let hoverCursor = $state('crosshair');

	// Recompute the image's bounding rect on layout changes so display↔source
	// coordinate mapping stays accurate.
	$effect(() => {
		if (!imgEl) {
			imgRect = null;
			return;
		}
		const el = imgEl;
		const update = () => {
			imgRect = el.getBoundingClientRect();
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener('scroll', update, true);
		window.addEventListener('resize', update);
		return () => {
			ro.disconnect();
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		};
	});

	function clampInt(n: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, Math.round(n)));
	}

	function displayToSource(dx: number, dy: number): { x: number; y: number } | null {
		if (!source || !imgRect || imgRect.width === 0 || imgRect.height === 0) {
			return null;
		}
		return {
			x: clampInt((dx * source.width) / imgRect.width, 0, source.width),
			y: clampInt((dy * source.height) / imgRect.height, 0, source.height),
		};
	}

	function sourceToDisplay(
		rect: CropRect,
	): { left: number; top: number; width: number; height: number } | null {
		if (!source || !imgRect || imgRect.width === 0 || imgRect.height === 0) {
			return null;
		}
		const ratioX = imgRect.width / source.width;
		const ratioY = imgRect.height / source.height;
		return {
			left: rect.x * ratioX,
			top: rect.y * ratioY,
			width: rect.w * ratioX,
			height: rect.h * ratioY,
		};
	}

	type Display = { left: number; top: number; width: number; height: number };

	function hitTestHandle(x: number, y: number, d: Display): Corner | null {
		const right = d.left + d.width;
		const bottom = d.top + d.height;
		const cx = d.left + d.width / 2;
		const cy = d.top + d.height / 2;
		const near = (px: number, py: number) =>
			Math.abs(x - px) <= HANDLE_HIT && Math.abs(y - py) <= HANDLE_HIT;
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
		if (!source || !imgRect || event.button !== 0) {
			return;
		}
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		const x = event.clientX - imgRect.left;
		const y = event.clientY - imgRect.top;

		// With a crop already set, the pointer moves or resizes it when it lands on
		// the box. Anywhere else starts a fresh selection.
		if (crop) {
			const display = sourceToDisplay(crop);
			if (display) {
				const handle = hitTestHandle(x, y, display);
				if (handle) {
					dragMode = {
						kind: 'resize',
						corner: handle,
						startX: x,
						startY: y,
						orig: { ...crop },
					};
					return;
				}
				if (isInsideCrop(x, y, display)) {
					dragMode = { kind: 'move', startX: x, startY: y, orig: { ...crop } };
					return;
				}
			}
		}
		dragMode = { kind: 'create', startX: x, startY: y, endX: x, endY: y };
	}

	function handlePointerMove(event: PointerEvent) {
		if (!imgRect) {
			return;
		}
		const x = Math.max(0, Math.min(imgRect.width, event.clientX - imgRect.left));
		const y = Math.max(0, Math.min(imgRect.height, event.clientY - imgRect.top));

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
			const a = displayToSource(minX, minY);
			const b = displayToSource(minX + dx, minY + dy);
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
		if (!source || !imgRect) {
			return;
		}
		const dxSrc = ((x - mode.startX) * source.width) / imgRect.width;
		const dySrc = ((y - mode.startY) * source.height) / imgRect.height;
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
		if (!source || !imgRect) {
			return;
		}
		const dxSrc = ((x - mode.startX) * source.width) / imgRect.width;
		const dySrc = ((y - mode.startY) * source.height) / imgRect.height;

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
		<div class="im-canvas-inner">
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

			{#if busy}
				<div class="im-busy">Updating preview…</div>
			{/if}
		</div>
	{:else}
		<div class="im-dropzone">
			<span>Drop an image here</span>
			<span class="im-hint">PNG · JPG · WebP · AVIF · GIF · TIFF · BMP</span>
		</div>
	{/if}
</div>
