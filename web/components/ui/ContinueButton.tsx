// ContinueButton.tsx
'use client';

type Props = {
  disabled: boolean;
  onClick: () => void;
};

export default function ContinueButton({ disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl bg-orange-500 px-6 py-2 font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Tiếp tục
    </button>
  );
}