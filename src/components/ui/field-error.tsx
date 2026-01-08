interface FieldErrorProps {
  error?: string;
}

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className="text-red-500 text-sm mt-1">{error}</p>
  );
}
