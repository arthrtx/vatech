/*
| Barril da família de overlays.
|
| `internals.tsx` fica de fora de propósito: os ícones e o botão de fechar são
| detalhe partilhado entre estes componentes, não API pública. Publicá-los
| tornava-os contrato — e um ícone que ninguém pode mudar sem partir um
| projecto é o pior sítio para prender um design system.
*/

export { Modal, type ModalProps } from './Modal';
export { Drawer, type DrawerProps } from './Drawer';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
  type DropdownMenuProps,
  type DropdownMenuSubProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuSubTriggerProps,
  type DropdownMenuSubContentProps,
  type DropdownMenuShortcutProps,
} from './DropdownMenu';

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverContentProps,
} from './Popover';

export { Tooltip, TooltipProvider, type TooltipProps, type TooltipProviderProps } from './Tooltip';

export {
  Toast,
  ToastProvider,
  useToast,
  type ToastProps,
  type ToastProviderProps,
  type ToastOptions,
  type ToastTone,
} from './Toast';

export { Alert, type AlertProps, type AlertTone } from './Alert';
export { Banner, type BannerProps, type BannerTone } from './Banner';
