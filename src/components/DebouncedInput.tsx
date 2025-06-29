import {
  type ChangeEvent,
  type ChangeEventHandler,
  forwardRef,
  type InputHTMLAttributes,
  type Ref,
  useEffect,
  useState,
} from 'react';

interface DebouncedInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: ChangeEventHandler<HTMLInputElement>;
  debounce?: number;
}

const DebouncedInput = forwardRef(function DebouncedInput(
  {
    value: initialValue,
    onChange,
    debounce = 300,
    ...props
  }: DebouncedInputProps,
  ref: Ref<HTMLInputElement>,
) {
  const [event, setEvent] = useState<ChangeEvent<HTMLInputElement>>();

  useEffect(() => {
    if (!event) return;
    const timeout = setTimeout(() => {
      onChange(event as ChangeEvent<HTMLInputElement>);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [debounce, onChange, event]);

  return (
    <input
      ref={ref}
      {...props}
      value={event?.target.value ?? initialValue}
      onChange={(e) => setEvent(e)}
    />
  );
});

export default DebouncedInput;
