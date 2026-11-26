/*
| Barril da família `shell` — a moldura da aplicação: onde se está, para onde
| se pode ir e quem está autenticado.
|
| Exportação nomeada e explícita, e não `export *`: assim vê-se de fora o que
| é público (o `useSidebar` é, porque quem escreve navegação própria precisa de
| saber se a barra está colapsada) e o que fica dentro.
*/

export { AppShell, type AppShellProps } from './AppShell';
export { Sidebar, useSidebar, type SidebarProps } from './Sidebar';
export { SidebarNav, type SidebarNavProps } from './SidebarNav';
export { SidebarGroup, type SidebarGroupProps } from './SidebarGroup';
export { SidebarItem, type SidebarItemProps } from './SidebarItem';
export { Topbar, type TopbarProps } from './Topbar';
export { MobileNav, type MobileNavProps } from './MobileNav';
export { Breadcrumbs, type BreadcrumbsProps, type Crumb } from './Breadcrumbs';
export { Stepper, type StepperProps, type Step } from './Stepper';
export { UserMenu, type UserMenuProps, type UserMenuItem } from './UserMenu';
export { ThemeToggle, type ThemeToggleProps, type Theme } from './ThemeToggle';
