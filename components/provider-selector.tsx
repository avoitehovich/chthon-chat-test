"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const allProviders = [
  {
    value: "openai",
    label: "OpenAI",
  },
  {
    value: "deepseek",
    label: "DeepSeek",
  },
  {
    value: "amazon",
    label: "Amazon",
  },
  {
    value: "xai",
    label: "Grok",
  },
]

interface ProviderSelectorProps {
  onSelect: (provider: string) => void
  defaultValue?: string
  availableProviders?: string[]
}

export function ProviderSelector({
  onSelect,
  defaultValue = "openai",
  availableProviders = ["openai", "deepseek", "amazon", "google", "xai"],
}: ProviderSelectorProps) {
  const [value, setValue] = useState(defaultValue)

  // Filter providers based on available ones
  const providers = allProviders.filter((p) => availableProviders.includes(p.value))

  // Load saved provider from localStorage on initial render
  useEffect(() => {
    const savedProvider = localStorage.getItem("selectedProvider")
    if (savedProvider && availableProviders.includes(savedProvider)) {
      setValue(savedProvider)
      onSelect(savedProvider)
    } else if (!availableProviders.includes(value)) {
      // If current value is not available, set to first available provider
      const firstAvailable = availableProviders[0]
      setValue(firstAvailable)
      onSelect(firstAvailable)
    }
  }, [onSelect, availableProviders, value])

  const handleSelect = (currentValue: string) => {
    setValue(currentValue)
    onSelect(currentValue)
    localStorage.setItem("selectedProvider", currentValue)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[110px] justify-between h-8 text-sm">
          {value ? providers.find((provider) => provider.value === value)?.label || "OpenAI" : "OpenAI"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[110px]">
        {providers.map((provider) => (
          <DropdownMenuItem key={provider.value} onClick={() => handleSelect(provider.value)}>
            <Check className={`mr-2 h-4 w-4 ${value === provider.value ? "opacity-100" : "opacity-0"}`} />
            {provider.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
