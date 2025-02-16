import { type ComponentProps, useEffect, useRef } from 'react';
import DebouncedInput from './DebouncedInput';

export default function Search({
  className,
  inputClassName = '',
  ...props
}: ComponentProps<typeof DebouncedInput> & { inputClassName?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div className={`flex ${className}`}>
      <DebouncedInput
        className={`w-full grow rounded-sm border-2 border-gray-400/20 bg-gray-300/10 px-4 py-2 hover:bg-gray-300/30 focus:bg-gray-300/30 focus:outline-hidden sm:rounded-r-none sm:border-r-0 ${inputClassName}`}
        placeholder="Type what you're looking for..."
        type="text"
        {...props}
        ref={inputRef}
      />
      <kbd
        className="my-auto hidden h-full rounded-sm rounded-l-none border-2 border-gray-400/20 bg-gray-400/20 p-2 text-gray-400 sm:block"
        title="Press / to focus"
      >
        /
      </kbd>
    </div>
  );
}
