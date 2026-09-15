"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui/primitives";

/**
 * Hook reutilizable para confirmaciones de acciones destructivas.
 * Devuelve `confirm(title, message)` que retorna `Promise<boolean>`.
 * El componente `ConfirmDialog` debe renderizarse en el JSX del caller.
 *
 * Ejemplo:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   async function handleDelete() {
 *     const ok = await confirm("Eliminar", "¿Estás seguro?");
 *     if (!ok) return;
 *     await api.delete(...);
 *   }
 *   return (<><ConfirmDialog /></>);
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const resolveRef = useRef<(v: boolean) => void>(undefined);
  const t = useTranslations("common");

  const confirm = useCallback((titleText: string, messageText: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setTitle(titleText);
      setMessage(messageText);
      setOpen(true);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    setOpen(false);
  }, []);

  return {
    confirm,
    ConfirmDialog: (
      <Modal open={open} onClose={() => close(false)} title={title}>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => close(false)}
            className="flex-1"
          >
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={() => close(true)}>
            {t("confirm")}
          </Button>
        </div>
      </Modal>
    ),
  };
}