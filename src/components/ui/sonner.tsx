"use client";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <SonnerToaster
      theme={resolved}
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "border bg-popover text-popover-foreground",
        },
      }}
      {...props}
    />
  );
}
