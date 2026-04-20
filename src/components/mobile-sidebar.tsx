"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <LogoMark className="size-6" />
        <span className="text-sm font-semibold">lmstation</span>
      </div>
      <div className="ml-auto">
        <ThemeToggle compact />
      </div>
    </div>
  );
}
