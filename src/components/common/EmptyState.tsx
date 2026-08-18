interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="border-y border-[#cfcbc0] py-16 text-center">
      <p className="display-type text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#696a62]">
        {message}
      </p>
    </div>
  );
}
