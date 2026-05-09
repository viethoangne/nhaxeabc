'use client';

type Props = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: Props) {
  return <main className="mx-auto max-w-[1400px] px-4 py-8">{children}</main>;
}