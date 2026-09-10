import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "uv";

const buttonBase =
	"font-mono inline-flex items-center justify-center px-6 py-2.5 text-xs font-semibold uppercase tracking-[1.5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50";

const buttonTones: Record<ButtonVariant, string> = {
	primary:
		"rounded-feature border border-transparent bg-mint text-black hover:bg-white/20 hover:shadow-[0_0_0_1px_#c2c2c2] active:bg-dim/90",
	secondary:
		"rounded-feature border border-transparent bg-surface text-bone hover:bg-white/20 hover:text-black hover:shadow-[0_0_0_1px_#c2c2c2]",
	tertiary:
		"rounded-cta border border-mint bg-transparent text-mint hover:bg-mint hover:text-black",
	uv: "rounded-promo border border-uv bg-transparent text-white hover:bg-uv/90",
};

export function Button({
	variant = "primary",
	type = "button",
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
	return (
		<button
			type={type}
			className={`${buttonBase} ${buttonTones[variant]} ${className}`}
			{...props}
		/>
	);
}

export type TagTone = "mint" | "uv" | "slate" | "white";

const tagTones: Record<TagTone, string> = {
	mint: "bg-mint text-black",
	uv: "bg-uv text-white",
	slate: "bg-surface text-bone",
	white: "bg-white text-black",
};

export function PillTag({
	tone = "mint",
	children,
}: {
	tone?: TagTone;
	children: ReactNode;
}) {
	return (
		<span
			className={`font-mono inline-block rounded-tile px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[1.8px] ${tagTones[tone]}`}
		>
			{children}
		</span>
	);
}

export type TileTone = "dark" | "mint" | "uv";

const tileTones: Record<
	TileTone,
	{ frame: string; kicker: string; title: string; meta: string }
> = {
	dark: {
		frame: "border border-white bg-canvas",
		kicker: "text-mint",
		title: "text-white group-hover:text-link",
		meta: "text-fog",
	},
	mint: {
		frame: "border border-transparent bg-mint",
		kicker: "text-black",
		title: "text-black",
		meta: "text-black/70",
	},
	uv: {
		frame: "border border-transparent bg-uv/90",
		kicker: "text-white",
		title: "text-white",
		meta: "text-white/70",
	},
};

export function StoryTile({
	timestamp,
	kicker,
	title,
	deck,
	tone = "dark",
}: {
	timestamp: string;
	kicker: string;
	title: string;
	deck?: string;
	tone?: TileTone;
}) {
	const t = tileTones[tone];
	return (
		<article className={`group rounded-tile p-6 md:p-8 ${t.frame}`}>
			<p
				className={`font-mono text-[11px] font-medium uppercase tracking-[1.1px] ${t.meta}`}
			>
				{timestamp}
			</p>
			<p
				className={`font-mono mt-3 text-xs uppercase tracking-[1.8px] ${t.kicker}`}
			>
				{kicker}
			</p>
			<h3
				className={`mt-2 font-sans text-2xl font-bold leading-none transition-colors duration-150 ${t.title}`}
			>
				{title}
			</h3>
			{deck ? (
				<p className={`mt-3 font-sans text-[13px] leading-relaxed ${t.meta}`}>
					{deck}
				</p>
			) : null}
		</article>
	);
}

export function Field({
	label,
	error,
	id,
	...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
	const inputId = id ?? label.toLowerCase().replaceAll(/\s+/gu, "-");
	return (
		<div>
			<label
				htmlFor={inputId}
				className="font-mono mb-2 block text-xs uppercase tracking-[1.5px] text-white"
			>
				{label}
			</label>
			<input
				id={inputId}
				className={`w-full rounded-[2px] border bg-canvas px-3 py-2 font-sans text-[15px] text-white placeholder:text-fog transition-colors duration-150 focus:outline-none ${
					error ? "border-uv" : "border-white/40 focus:border-mint"
				}`}
				{...props}
			/>
			{error ? (
				<p className="font-mono mt-2 text-[11px] uppercase tracking-[1.1px] text-white">
					{error}
				</p>
			) : null}
		</div>
	);
}
