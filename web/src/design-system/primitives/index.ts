/*
| Barril da família. Exporta por nome e não com `export *`: a família tem
| símbolos internos (a cva `avatar`, partilhada entre Avatar e AvatarGroup para
| os dois não divergirem de medida) que não são API pública. Com `export *`
| saíam para fora sem ninguém decidir isso.
*/

export { Heading, type HeadingProps } from './Heading';
export { Text, type TextProps } from './Text';
export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { ButtonGroup, type ButtonGroupProps } from './ButtonGroup';
export { Badge, type BadgeProps } from './Badge';
export { Tag, type TagProps } from './Tag';
export { StatusDot, type StatusDotProps } from './StatusDot';
export { Avatar, type AvatarProps } from './Avatar';
export { AvatarGroup, type AvatarGroupProps } from './AvatarGroup';
export { Spinner, type SpinnerProps } from './Spinner';
export { Kbd, type KbdProps } from './Kbd';
export { Truncate, type TruncateProps } from './Truncate';
