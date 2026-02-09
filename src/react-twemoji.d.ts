declare module 'react-twemoji' {
  import { ComponentType, ReactNode } from 'react';

  interface TwemojiProps {
    children?: ReactNode;
    noWrapper?: boolean;
    options?: {
      className?: string;
      folder?: string;
      ext?: string;
      base?: string;
      size?: string | number;
    };
    tag?: string;
  }

  const Twemoji: ComponentType<TwemojiProps>;
  export default Twemoji;
}
