"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query"
import { Toaster } from "./toaster"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider {...props} />
        <Toaster />
      </ChakraProvider>
    </QueryClientProvider>
  )
}
