"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const allProviders = [
  {
    value: "openai/gpt-4o-mini",
    label: "OpenAI",
    shortName: "OpenAI",
  },
  {
    value: "google/gemini-1.5-flash",
    label: "Google Gemini",
    shortName: "Google",
  },
  {
    value: "xai/grok-2-vision-latest",
    label: "Grok (Premium)",
    shortName: "Grok",
  },
]

interface ProviderSelectorProps {
  onSelect: (provider: string) => void
  defaultValue?: string
  availableProviders?: string[]
}

export function ProviderSelector({
  onSelect,
  defaultValue = "openai/gpt-4o-mini",
  availableProviders = ["openai/gpt-4o-mini", "google/gemini-1.5-flash"],
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

  // Get display name for the current value
  const getDisplayName = (val: string) => {
    const provider = allProviders.find((p) => p.value === val)
    return provider ? provider.shortName : "OpenAI"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[110px] justify-between h-8 text-sm">
          {value ? getDisplayName(value) : "OpenAI"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
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
