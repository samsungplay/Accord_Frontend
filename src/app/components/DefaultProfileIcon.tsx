import React, { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { icons } from "@dicebear/collection";

export default function DefaultProfileIcon({
  backgroundHexcode,
  size,
}: {
  backgroundHexcode: string;
  size: number;
}) {
  const avatarURL = useMemo(() => {
    return createAvatar(icons, {
      size: size,
      backgroundColor: [backgroundHexcode.substring(1)],
      radius: 50,
      icon: ["tree"],
    }).toDataUri();
  }, [backgroundHexcode]);
  return (
    <img
      src={avatarURL}
      width={size}
      height={size}
      className="object-contain max-w-none"
    />
  );
}
