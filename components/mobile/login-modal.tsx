"use client";

import { X, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginRegisterForm } from "./login-register-form";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px] overflow-hidden rounded-3xl p-0">
        <DialogHeader className="relative rounded-t-3xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-6 text-primary-foreground">
          <div className="absolute inset-0 overflow-hidden rounded-t-3xl">
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute bottom-4 right-10 h-10 w-10 rounded-full bg-accent/30" />
          </div>
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="关闭登录弹窗"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                AI 财税体检助手
              </DialogTitle>
              <p className="mt-1 text-sm text-white/75">
                领取沙龙资料，获取企业财税风险初步诊断
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-card p-5">
          <LoginRegisterForm compact submitText="登录并继续" onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
