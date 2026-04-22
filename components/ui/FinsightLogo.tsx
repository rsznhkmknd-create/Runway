type Props = {
  size?: number
  color?: string
  className?: string
}

export default function FinsightLogo({
  size = 32,
  color = '#00C48C',
  className,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Finsight"
      role="img"
    >
      <path
        d="M 20 10 L 20 46 L 138 46 L 155 28 L 138 10 Z"
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M 20 58 L 20 94 L 116 94 L 133 76 L 116 58 Z"
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M 20 106 L 20 136 L 66 136 L 66 106 Z"
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
