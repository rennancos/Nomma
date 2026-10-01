import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { formatDateBR, parseDateBR } from '@/utils/date';
import { ChipSelect, DateField, TextField, Toggle, type ChipOption, type TextFieldProps } from './Controls';

// Ligações entre React Hook Form e os controles visuais.

interface Bound<T extends FieldValues, O> {
  control: Control<T, unknown, O>;
  name: Path<T>;
}

export function FormField<T extends FieldValues, O>({ control, name, ...props }: Bound<T, O> & TextFieldProps) {
  const { field, fieldState } = useController({ control, name });
  return (
    <TextField
      value={String(field.value ?? '')}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
      {...props}
    />
  );
}

export function FormChips<T extends FieldValues, O, V extends string>({ control, name, ...props }: Bound<T, O> & {
  options: ChipOption<V>[];
  label?: string;
  allowNone?: boolean;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <ChipSelect<V>
      value={(field.value as V | null) ?? null}
      onChange={field.onChange}
      error={fieldState.error?.message}
      {...props}
    />
  );
}

/** Data escolhida no calendário; o formulário continua guardando "DD/MM/AAAA", como os esquemas esperam. */
export function FormDateField<T extends FieldValues, O>({ control, name, ...props }: Bound<T, O> & {
  label?: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <DateField
      value={parseDateBR(String(field.value ?? ''))}
      onChange={(iso) => field.onChange(iso ? formatDateBR(iso) : '')}
      error={fieldState.error?.message}
      {...props}
    />
  );
}

export function FormToggle<T extends FieldValues, O>({ control, name, label, hint }: Bound<T, O> & {
  label: string;
  hint?: string;
}) {
  const { field } = useController({ control, name });
  return <Toggle label={label} hint={hint} value={Boolean(field.value)} onChange={field.onChange} />;
}
