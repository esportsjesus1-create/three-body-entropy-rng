"""
Command-line interface for crypto-service.

Provides standalone tools for testing and using the cryptographic
primitives without requiring the full API server.

Usage:
    crypto-cli keygen              Generate new RSA-4096 key pair
    crypto-cli sign <data>         Sign data with private key
    crypto-cli verify <data> <sig> Verify signature
    crypto-cli entropy             Generate mixed entropy
    crypto-cli hash <data>         Compute SHA-256 hash
"""

import argparse
import base64
import json
import sys
from pathlib import Path
from typing import Optional

from .rsa import RSAKeyManager
from .hkdf import HKDFEntropyMixer
from .hash import sha256_hex


def cmd_keygen(args: argparse.Namespace) -> int:
    """Generate new RSA-4096 key pair."""
    manager = RSAKeyManager()
    
    output = {
        "key_size": manager.key_size,
        "public_key_pem": manager.public_key_pem,
    }
    
    if args.include_private:
        password = args.password.encode('utf-8') if args.password else None
        output["private_key_pem"] = manager.export_private_key_pem(password)
        if password:
            output["encrypted"] = True
    
    if args.output:
        Path(args.output).write_text(json.dumps(output, indent=2))
        print(f"Keys written to {args.output}", file=sys.stderr)
    else:
        print(json.dumps(output, indent=2))
    
    return 0


def cmd_sign(args: argparse.Namespace) -> int:
    """Sign data with RSA private key."""
    # Load or generate key
    if args.key_file:
        key_data = json.loads(Path(args.key_file).read_text())
        password = args.password.encode('utf-8') if args.password else None
        manager = RSAKeyManager.from_private_key_pem(key_data["private_key_pem"], password)
    else:
        print("Warning: Using ephemeral key (signature cannot be verified later)", file=sys.stderr)
        manager = RSAKeyManager()
    
    # Get data to sign
    if args.data == "-":
        data = sys.stdin.buffer.read()
    else:
        data = args.data.encode('utf-8')
    
    # Sign
    signature = manager.sign(data)
    signature_b64 = base64.b64encode(signature).decode('utf-8')
    
    output = {
        "data_hash": sha256_hex(data),
        "signature": signature_b64,
        "public_key_pem": manager.public_key_pem,
    }
    
    print(json.dumps(output, indent=2))
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    """Verify signature against data."""
    # Load public key
    if args.key_file:
        key_data = json.loads(Path(args.key_file).read_text())
        public_key_pem = key_data.get("public_key_pem")
        if not public_key_pem:
            print("Error: Key file does not contain public_key_pem", file=sys.stderr)
            return 1
    elif args.public_key:
        public_key_pem = args.public_key
    else:
        print("Error: Must provide --key-file or --public-key", file=sys.stderr)
        return 1
    
    # Get data
    if args.data == "-":
        data = sys.stdin.buffer.read()
    else:
        data = args.data.encode('utf-8')
    
    # Decode signature
    try:
        signature = base64.b64decode(args.signature)
    except Exception as e:
        print(f"Error: Invalid base64 signature: {e}", file=sys.stderr)
        return 1
    
    # Verify
    from .rsa import create_verifier_from_public_key
    verifier = create_verifier_from_public_key(public_key_pem)
    valid = verifier.verify(data, signature)
    
    output = {
        "valid": valid,
        "data_hash": sha256_hex(data),
    }
    
    print(json.dumps(output, indent=2))
    return 0 if valid else 1


def cmd_entropy(args: argparse.Namespace) -> int:
    """Generate mixed entropy using HKDF-SHA256."""
    info = args.info.encode('utf-8') if args.info else HKDFEntropyMixer.DEFAULT_INFO
    
    if args.seed:
        # Deterministic mode
        seed = bytes.fromhex(args.seed)
        entropy = HKDFEntropyMixer.derive_from_seed(seed, info=info, length=args.length)
        output = {
            "mode": "deterministic",
            "seed": args.seed,
            "entropy_hex": entropy.hex(),
            "length": args.length,
            "info": info.decode('utf-8'),
        }
    else:
        # Random mode
        entropy, source_info = HKDFEntropyMixer.generate(info=info, length=args.length)
        output = {
            "mode": "random",
            "entropy_hex": entropy.hex(),
            "length": args.length,
            "sources": source_info.to_dict(),
        }
    
    print(json.dumps(output, indent=2))
    return 0


def cmd_hash(args: argparse.Namespace) -> int:
    """Compute SHA-256 hash of data."""
    if args.data == "-":
        data = sys.stdin.buffer.read()
    else:
        data = args.data.encode('utf-8')
    
    hash_hex = sha256_hex(data)
    
    output = {
        "hash": hash_hex,
        "algorithm": "SHA-256",
        "input_length": len(data),
    }
    
    print(json.dumps(output, indent=2))
    return 0


def main(argv: Optional[list] = None) -> int:
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        prog="crypto-cli",
        description="Cryptographic utilities for Three-Body RNG",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # keygen command
    keygen_parser = subparsers.add_parser("keygen", help="Generate RSA-4096 key pair")
    keygen_parser.add_argument("--include-private", action="store_true", help="Include private key in output")
    keygen_parser.add_argument("--password", help="Password to encrypt private key")
    keygen_parser.add_argument("--output", "-o", help="Output file path")
    
    # sign command
    sign_parser = subparsers.add_parser("sign", help="Sign data with RSA private key")
    sign_parser.add_argument("data", help="Data to sign (use '-' for stdin)")
    sign_parser.add_argument("--key-file", "-k", help="Key file from keygen")
    sign_parser.add_argument("--password", help="Password for encrypted private key")
    
    # verify command
    verify_parser = subparsers.add_parser("verify", help="Verify RSA signature")
    verify_parser.add_argument("data", help="Original data (use '-' for stdin)")
    verify_parser.add_argument("signature", help="Base64-encoded signature")
    verify_parser.add_argument("--key-file", "-k", help="Key file containing public key")
    verify_parser.add_argument("--public-key", help="PEM-encoded public key")
    
    # entropy command
    entropy_parser = subparsers.add_parser("entropy", help="Generate mixed entropy")
    entropy_parser.add_argument("--seed", help="Hex seed for deterministic generation")
    entropy_parser.add_argument("--length", "-l", type=int, default=32, help="Output length in bytes")
    entropy_parser.add_argument("--info", help="Context info string")
    
    # hash command
    hash_parser = subparsers.add_parser("hash", help="Compute SHA-256 hash")
    hash_parser.add_argument("data", help="Data to hash (use '-' for stdin)")
    
    args = parser.parse_args(argv)
    
    if not args.command:
        parser.print_help()
        return 1
    
    commands = {
        "keygen": cmd_keygen,
        "sign": cmd_sign,
        "verify": cmd_verify,
        "entropy": cmd_entropy,
        "hash": cmd_hash,
    }
    
    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
