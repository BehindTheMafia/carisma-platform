"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      value,
      onSelect,
      placeholder = "Seleccionar...",
      searchPlaceholder = "Buscar...",
      emptyText = "Sin resultados",
      disabled = false,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              "flex min-h-10 min-w-0 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer",
              "transition-colors duration-150",
              "data-[placeholder]:text-muted-foreground",
              "hover:border-gold/40",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-gold",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "data-[state=open]:border-gold data-[state=open]:ring-1 data-[state=open]:ring-gold/20",
              selectedLabel ? "text-foreground font-medium" : "text-muted-foreground font-normal",
              className,
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">{selectedLabel || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0 rounded-lg overflow-hidden"
          align="center"
          sideOffset={4}
        >
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold/60 via-gold to-gold/60 z-10" />
            <Command>
              <CommandInput
                placeholder={searchPlaceholder}
                className="h-11 border-none"
              />
              <CommandList>
                <CommandEmpty className="py-8 text-sm text-muted-foreground">
                  {emptyText}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, ...(option.keywords ?? [])]}
                      onSelect={(currentValue) => {
                        onSelect(currentValue);
                        setOpen(false);
                      }}
                      className="cursor-pointer aria-selected:bg-gold/5 data-[selected=true]:bg-gold/5"
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {value === option.value && (
                        <Check className="ml-2 h-4 w-4 shrink-0 text-gold" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = "Combobox";

export { Combobox };
