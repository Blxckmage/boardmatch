import { useEffect, useRef, useState } from "react";

export type Direction = "left" | "right";

export type FlingSignal = { direction: Direction; n: number } | null;

type Drag = { x: number; y: number; active: boolean };

const SWIPE_PX = 120;

export function cardTransform(
	drag: Drag,
	fling: Direction | null,
): { transform: string; transition: string } {
	if (fling) {
		return {
			transform: `translate3d(${fling === "right" ? 140 : -140}vw, ${drag.y}px, 0) rotate(${
				fling === "right" ? 18 : -18
			}deg)`,
			transition: "transform 250ms linear",
		};
	}
	if (drag.active) {
		const rotation = Math.max(-10, Math.min(10, drag.x / 14));
		return {
			transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`,
			transition: "none",
		};
	}
	return {
		transform: "translate3d(0, 0, 0)",
		transition: "transform 200ms ease-out",
	};
}

function useClearOnUnmount(timer: {
	current: ReturnType<typeof setTimeout> | null;
}) {
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
}

export function useDragMachine(onFling: (direction: Direction) => void) {
	const [drag, setDrag] = useState<Drag>({ x: 0, y: 0, active: false });
	const [fling, setFling] = useState<Direction | null>(null);
	const gesture = useRef<{ x: number; y: number; pid: number } | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useClearOnUnmount(timer);

	const flingTo = (direction: Direction) => {
		setFling(direction);
		setDrag((d) => ({ ...d, active: false }));
		timer.current = setTimeout(() => onFling(direction), 250);
	};

	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		const g = gesture.current;
		if (!g || g.pid !== e.pointerId) return;
		gesture.current = null;
		const dx = e.clientX - g.x;
		if (Math.abs(dx) > SWIPE_PX) {
			flingTo(dx > 0 ? "right" : "left");
			return;
		}
		setDrag({ x: 0, y: 0, active: false });
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (fling) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		gesture.current = { x: e.clientX, y: e.clientY, pid: e.pointerId };
		setDrag({ x: 0, y: 0, active: true });
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const g = gesture.current;
		if (!g || g.pid !== e.pointerId) return;
		setDrag({ x: e.clientX - g.x, y: e.clientY - g.y, active: true });
	};

	return {
		drag,
		fling,
		flingTo,
		onPointerDown,
		onPointerMove,
		onPointerUp,
	};
}
