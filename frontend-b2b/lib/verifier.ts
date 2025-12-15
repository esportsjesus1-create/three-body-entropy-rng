/**
 * Client-side fairness verification using Web Crypto API
 * Based on N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
 */

import {
  VerificationBundle,
  SimplifiedVerificationBundle,
  VerifyOutput,
} from './types';

/**
 * Converts a string to ArrayBuffer for Web Crypto API
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Converts ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes SHA-256 hash using Web Crypto API
 */
async function sha256(data: string): Promise<string> {
  const buffer = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * HKDF derivation using Web Crypto API
 */
async function hkdfDerive(
  ikm: string,
  salt: string,
  info: string,
  length: number = 32
): Promise<string> {
  const ikmBuffer = stringToArrayBuffer(ikm);
  const saltBuffer = stringToArrayBuffer(salt);
  const infoBuffer = stringToArrayBuffer(info);

  const key = await crypto.subtle.importKey(
    'raw',
    ikmBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBuffer,
      info: infoBuffer,
    },
    key,
    length * 8
  );

  return arrayBufferToHex(derivedBits);
}

/**
 * Verifies commitment hash (Check 1)
 * SHA256(serverSeed) should equal commitment.commitmentHash
 */
async function verifyCommitment(
  serverSeed: string,
  expectedHash: string
): Promise<{ ok: boolean; computed: string; details: string }> {
  try {
    const computed = await sha256(serverSeed);
    const ok = computed.toLowerCase() === expectedHash.toLowerCase();
    return {
      ok,
      computed,
      details: ok
        ? 'Server seed hash matches commitment'
        : `Hash mismatch: expected ${expectedHash}, got ${computed}`,
    };
  } catch (error) {
    return {
      ok: false,
      computed: '',
      details: `Error computing hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verifies seed mixing (Check 2)
 * HKDF derivation should match mixing.combinedSeedHex
 */
async function verifyMixing(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  salt: string,
  info: string,
  expectedCombined: string
): Promise<{ ok: boolean; computed: string; details: string }> {
  try {
    const ikm = `${serverSeed}:${clientSeed}:${nonce}`;
    const computed = await hkdfDerive(ikm, salt, info, 32);
    const ok = computed.toLowerCase() === expectedCombined.toLowerCase();
    return {
      ok,
      computed,
      details: ok
        ? 'HKDF derivation matches expected combined seed'
        : `Derivation mismatch: expected ${expectedCombined}, got ${computed}`,
    };
  } catch (error) {
    return {
      ok: false,
      computed: '',
      details: `Error in HKDF derivation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Derives reel stops from combined seed (Check 3)
 * Split combined seed into chunks and derive reel positions
 */
function deriveReelStops(
  combinedSeedHex: string,
  reelCount: number,
  symbolsPerReel: number = 20
): number[] {
  const stops: number[] = [];
  const bytesPerReel = 4;

  for (let i = 0; i < reelCount; i++) {
    const start = i * bytesPerReel * 2;
    const end = start + bytesPerReel * 2;
    const chunk = combinedSeedHex.substring(start, end);
    const value = parseInt(chunk, 16);
    const stop = value % symbolsPerReel;
    stops.push(stop);
  }

  return stops;
}

/**
 * Verifies result derivation (Check 3)
 * Reel stops should be deterministically derived from combined seed
 */
function verifyResult(
  combinedSeedHex: string,
  expectedStops: number[],
  symbolsPerReel: number = 20
): { ok: boolean; computedStops: number[]; details: string } {
  try {
    const computedStops = deriveReelStops(
      combinedSeedHex,
      expectedStops.length,
      symbolsPerReel
    );
    const ok = computedStops.every((stop, i) => stop === expectedStops[i]);
    return {
      ok,
      computedStops,
      details: ok
        ? 'Reel stops match expected derivation'
        : `Stops mismatch: expected [${expectedStops.join(', ')}], got [${computedStops.join(', ')}]`,
    };
  } catch (error) {
    return {
      ok: false,
      computedStops: [],
      details: `Error deriving stops: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verifies hash chain integrity
 * Each hash should be SHA256 of the next hash in the chain
 */
async function verifyHashChain(
  hashChain: string[]
): Promise<{ ok: boolean; details: string }> {
  if (!hashChain || hashChain.length < 2) {
    return {
      ok: true,
      details: 'Hash chain too short to verify (single hash or empty)',
    };
  }

  try {
    for (let i = 0; i < hashChain.length - 1; i++) {
      const expectedHash = await sha256(hashChain[i + 1]);
      if (expectedHash.toLowerCase() !== hashChain[i].toLowerCase()) {
        return {
          ok: false,
          details: `Hash chain broken at index ${i}: hash of [${i + 1}] does not equal [${i}]`,
        };
      }
    }
    return {
      ok: true,
      details: `Hash chain verified: ${hashChain.length} hashes in sequence`,
    };
  } catch (error) {
    return {
      ok: false,
      details: `Error verifying hash chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Type guard to check if bundle is N6 format
 */
function isN6Bundle(
  bundle: VerificationBundle | SimplifiedVerificationBundle
): bundle is VerificationBundle {
  return 'version' in bundle && 'game' in bundle && 'seeds' in bundle;
}

/**
 * Main verification function
 * Parses and verifies a verification bundle
 */
export async function verifyBundle(
  bundle: VerificationBundle | SimplifiedVerificationBundle
): Promise<VerifyOutput> {
  const warnings: string[] = [];

  if (isN6Bundle(bundle)) {
    const commitmentResult = await verifyCommitment(
      bundle.seeds.serverSeed,
      bundle.commitment.commitmentHash
    );

    const mixingResult = await verifyMixing(
      bundle.seeds.serverSeed,
      bundle.seeds.clientSeed,
      bundle.seeds.nonce,
      bundle.mixing.salt,
      bundle.mixing.info,
      bundle.mixing.combinedSeedHex
    );

    const resultCheck = verifyResult(
      bundle.mixing.combinedSeedHex,
      bundle.result.reelStops
    );

    const ok = commitmentResult.ok && mixingResult.ok && resultCheck.ok;

    return {
      ok,
      checks: {
        commitment: commitmentResult,
        mixing: mixingResult,
        result: resultCheck,
      },
      warnings,
      summary: ok
        ? 'All verification checks passed'
        : 'One or more verification checks failed',
    };
  } else {
    const commitmentResult = bundle.serverSeed && bundle.commitmentHash
      ? await verifyCommitment(bundle.serverSeed, bundle.commitmentHash)
      : { ok: true, computed: '', details: 'No commitment data to verify' };

    if (!bundle.serverSeed || !bundle.commitmentHash) {
      warnings.push('No server seed or commitment hash provided');
    }

    const mixingResult = bundle.serverSeed &&
      bundle.clientSeed &&
      bundle.nonce !== undefined &&
      bundle.combinedSeedHex
      ? await verifyMixing(
          bundle.serverSeed,
          bundle.clientSeed,
          bundle.nonce,
          'tb-entropy-v1',
          'spin',
          bundle.combinedSeedHex
        )
      : { ok: true, computed: '', details: 'No mixing data to verify' };

    if (!bundle.combinedSeedHex) {
      warnings.push('No combined seed hex provided for mixing verification');
    }

    const resultCheck = bundle.combinedSeedHex
      ? verifyResult(bundle.combinedSeedHex, bundle.outcome.reels)
      : { ok: true, computedStops: [], details: 'No combined seed for result verification' };

    const hashChainResult = bundle.hashChain
      ? await verifyHashChain(bundle.hashChain)
      : undefined;

    const ok =
      commitmentResult.ok &&
      mixingResult.ok &&
      resultCheck.ok &&
      (hashChainResult?.ok ?? true);

    return {
      ok,
      checks: {
        commitment: commitmentResult,
        mixing: mixingResult,
        result: resultCheck,
        hashChain: hashChainResult,
      },
      warnings,
      summary: ok
        ? 'All verification checks passed'
        : 'One or more verification checks failed',
    };
  }
}

/**
 * Parses JSON string to verification bundle
 */
export function parseBundle(
  jsonString: string
): VerificationBundle | SimplifiedVerificationBundle {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON: expected an object');
    }

    if ('version' in parsed && 'game' in parsed && 'seeds' in parsed) {
      return parsed as VerificationBundle;
    }

    if ('spinId' in parsed && 'outcome' in parsed) {
      return parsed as SimplifiedVerificationBundle;
    }

    throw new Error(
      'Invalid bundle format: missing required fields (spinId, outcome or version, game, seeds)'
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON syntax: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generates an audit report from verification results
 */
export function generateAuditReport(
  bundle: VerificationBundle | SimplifiedVerificationBundle,
  result: VerifyOutput
): string {
  const timestamp = new Date().toISOString();
  const spinId = isN6Bundle(bundle) ? bundle.spin.spinId : bundle.spinId;

  let report = `=== FAIRNESS VERIFICATION AUDIT REPORT ===\n`;
  report += `Generated: ${timestamp}\n`;
  report += `Spin ID: ${spinId}\n`;
  report += `Overall Result: ${result.ok ? 'PASSED' : 'FAILED'}\n\n`;

  report += `--- VERIFICATION CHECKS ---\n\n`;

  report += `1. Commitment Verification\n`;
  report += `   Status: ${result.checks.commitment.ok ? 'PASSED' : 'FAILED'}\n`;
  report += `   Details: ${result.checks.commitment.details}\n`;
  if (result.checks.commitment.computed) {
    report += `   Computed Hash: ${result.checks.commitment.computed}\n`;
  }
  report += `\n`;

  report += `2. Seed Mixing Verification\n`;
  report += `   Status: ${result.checks.mixing.ok ? 'PASSED' : 'FAILED'}\n`;
  report += `   Details: ${result.checks.mixing.details}\n`;
  if (result.checks.mixing.computed) {
    report += `   Computed Combined Seed: ${result.checks.mixing.computed}\n`;
  }
  report += `\n`;

  report += `3. Result Derivation Verification\n`;
  report += `   Status: ${result.checks.result.ok ? 'PASSED' : 'FAILED'}\n`;
  report += `   Details: ${result.checks.result.details}\n`;
  if (result.checks.result.computedStops.length > 0) {
    report += `   Computed Reel Stops: [${result.checks.result.computedStops.join(', ')}]\n`;
  }
  report += `\n`;

  if (result.checks.hashChain) {
    report += `4. Hash Chain Verification\n`;
    report += `   Status: ${result.checks.hashChain.ok ? 'PASSED' : 'FAILED'}\n`;
    report += `   Details: ${result.checks.hashChain.details}\n`;
    report += `\n`;
  }

  if (result.warnings.length > 0) {
    report += `--- WARNINGS ---\n`;
    result.warnings.forEach((warning, i) => {
      report += `${i + 1}. ${warning}\n`;
    });
    report += `\n`;
  }

  report += `--- BUNDLE DATA ---\n`;
  report += JSON.stringify(bundle, null, 2);
  report += `\n\n`;

  report += `=== END OF REPORT ===\n`;

  return report;
}
