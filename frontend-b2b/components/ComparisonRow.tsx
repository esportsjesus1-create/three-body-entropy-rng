"use client";

export interface ComparisonRowProps {
  feature: string;
  traditional: string;
  provablyFair: string;
  threeBody: string;
  traditionalPass: boolean;
  provablyFairPass: boolean;
  threeBodyPass: boolean;
}

function StatusIcon({ pass }: { pass: boolean }) {
  if (pass) {
    return (
      <span className="text-green-500" aria-label="Supported">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 inline-block mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="text-red-500" aria-label="Not supported">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 inline-block mr-2"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export default function ComparisonRow({
  feature,
  traditional,
  provablyFair,
  threeBody,
  traditionalPass,
  provablyFairPass,
  threeBodyPass,
}: ComparisonRowProps) {
  return (
    <tr className="border-b border-primary/20 hover:bg-secondary-bg/50 transition-colors">
      <td className="py-4 px-4 font-semibold text-text-primary">{feature}</td>
      <td className="py-4 px-4 text-text-secondary">
        <StatusIcon pass={traditionalPass} />
        {traditional}
      </td>
      <td className="py-4 px-4 text-text-secondary">
        <StatusIcon pass={provablyFairPass} />
        {provablyFair}
      </td>
      <td className="py-4 px-4 text-secondary font-semibold bg-primary/10">
        <StatusIcon pass={threeBodyPass} />
        {threeBody}
      </td>
    </tr>
  );
}
