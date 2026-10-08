# API Catalogue

This catalogue is generated from the OpenAPI contracts under `openapi/` in this repository.

- Catalog source: `openapi/*.yaml` (mirrors of the provider specs; each provider repo is the source of truth for its own spec)
- Machine-readable index: [`catalog/index.json`](../catalog/index.json)
- Endpoint tables generated at: 2026-02-26T15:18:15Z (from the monolith's `api/openapi/`; endpoint data re-checked against `openapi/*.yaml` on 2026-10-08)
- Scope: Open Finance capability services + bounded-context services

## Catalog index and provider to catalog flow

Status: **Proposed** (target-state process; adopted when the API Governance Guild merges it).

[`catalog/index.json`](../catalog/index.json) has one entry per spec in `openapi/`, plus `expected` entries for provider specs that are not mirrored yet. Each entry records the `serviceId`, the owning repository (`ownerRepo`), where the spec lives in that repository (`providerSpecPath`), the monolith file it was seeded from (`monolithSource`), `info.version`, open provider PRs that change the spec, and a `status`:

| Status | Meaning |
|---|---|
| `mirrored` | Byte-identical to the provider spec on the provider's `main`. |
| `drifted` | Differs from the provider spec on `main`; needs a mirror PR. |
| `provider-missing` | The owning provider has no spec on `main`. |
| `catalog-only` | Exists only here (seeded from the monolith); no provider publishes it. |
| `expected` | The provider publishes a spec on `main` that is not mirrored here yet (`file` is `null`). |

Checks:

- `npm test` (runs `scripts/ci/check-catalog-index.mjs`, part of `ci/test`) fails when a spec has no index entry, an entry points at a missing file, a required field is missing, a status is not in the set above, `ownerRepo` is not a `COPUR/fintechbankx-*` repository, or `info.version` disagrees with the spec.
- `scripts/catalog/check-provider-drift.sh` compares every entry with its provider spec and prints a table. It runs weekly and on demand in the `provider-drift` workflow, which is informational and never runs on pull requests. Private provider repos need a read-only token in the `PROVIDER_SPECS_READ_TOKEN` repository secret; without it they show as `unverified`.

Flow for a contract change:

1. **Provider PR first.** The owning service changes `api/openapi/<file>.yaml` in the same PR as the code, and passes its own Redocly, oasdiff and FAPI/DPoP gates.
2. **Catalog mirror PR second.** After the provider PR merges, copy the provider file unchanged to `openapi/<file>.yaml` here (keep the existing file name so oasdiff keeps its baseline), update the entry in `catalog/index.json` (`status`, `info.version`, `providerCommit`, `openProviderChanges`) and regenerate this document. Never edit a spec here first.
3. **oasdiff on the mirror.** `ci/test` runs `scripts/ci/oasdiff-breaking.sh` against `origin/main`, so the mirror PR shows the same breaking changes the provider accepted.
4. **Accepted breaking changes.** If the provider accepted a breaking change, it lists the exact oasdiff errors in `<spec>.accepted-breaking.txt` next to the spec (for example `api/openapi/customer-context.accepted-breaking.txt`, proposed in `COPUR/fintechbankx-customer-profile-kyc-core` PR #12). The mirror PR copies that file to `openapi/<spec>.accepted-breaking.txt`. Note: this repository's `scripts/ci/oasdiff-breaking.sh` does not read that file today, so such a mirror PR fails `ci/test` until the API Governance Guild decides whether to add the same `--err-ignore` support here. A breaking change that is not accepted by the provider needs a new major version (a new spec file), not an edit.
5. **Consumers last.** Consumers move only after the catalog mirror is merged.

New provider specs (the `expected` entries: recurring mandates, bulk orchestration, request to pay) arrive the same way: one mirror PR per provider that adds `openapi/<file>.yaml` and switches the entry from `expected` to `mirrored`.

## Service Inventory

| Service | Contract | Title | Version | Endpoints | Security Schemes |
|---|---|---|---|---:|---|
| `atm-directory-service` | `openapi/atm-directory-service.yaml` | ATM Directory Service API | `0.1.0` | 1 | public |
| `banking-metadata-service` | `openapi/banking-metadata-service.yaml` | Banking Metadata Enrichment Service API | `0.1.0` | 4 | bearerAuth, dpopAuth |
| `business-financial-data-service` | `openapi/business-financial-data-service.yaml` | Business Financial Data Service API | `0.1.0` | 3 | bearerAuth, dpopAuth |
| `compliance-context` | `openapi/compliance-context.yaml` | Compliance Context Service API | `1.0.0` | 2 | bearerAuth, dpopAuth |
| `confirmation-of-payee-service` | `openapi/confirmation-of-payee-service.yaml` | Confirmation of Payee Verification Service API | `0.1.0` | 1 | bearerAuth, dpopAuth |
| `consent-authorization-service` | `openapi/consent-authorization-service.yaml` | Consent and Authorization Service API | `0.1.0` | 5 | dpopAuth |
| `customer-context` | `openapi/customer-context.yaml` | Customer Context Service API | `1.0.0` | 5 | bearerAuth, dpopAuth |
| `loan-context` | `openapi/loan-context.yaml` | Loan Context Service API | `1.0.0` | 7 | bearerAuth, dpopAuth |
| `open-finance-context` | `openapi/open-finance-context.yaml` | Open Finance Context Service API | `0.1.0` | 0 | bearerAuth, dpopAuth |
| `open-products-service` | `openapi/open-products-service.yaml` | Open Products Catalog Service API | `0.1.0` | 1 | public |
| `payment-context` | `openapi/payment-context.yaml` | Payment Context Service API | `1.0.0` | 6 | bearerAuth, dpopAuth |
| `personal-financial-data-service` | `openapi/personal-financial-data-service.yaml` | Personal Financial Data Service API | `0.1.0` | 7 | bearerAuth, dpopAuth |
| `risk-context` | `openapi/risk-context.yaml` | Risk Context Service API | `1.0.0` | 2 | bearerAuth, dpopAuth |

## Endpoint Catalogue

## ATM Directory Service API (`atm-directory-service`)

- Contract: `openapi/atm-directory-service.yaml`
- Version: `0.1.0`
- Security schemes: public
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `GET` | `/atms` | `listAtms` | List ATMs | public |

## Banking Metadata Enrichment Service API (`banking-metadata-service`)

- Contract: `openapi/banking-metadata-service.yaml`
- Version: `0.1.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `GET` | `/metadata/accounts/{AccountId}` | `getAccountMetadata` | Retrieve account scheme metadata | bearerAuth, dpopAuth |
| `GET` | `/metadata/accounts/{AccountId}/parties` | `getPartyMetadata` | Retrieve party metadata | bearerAuth, dpopAuth |
| `GET` | `/metadata/accounts/{AccountId}/transactions` | `getTransactionMetadata` | Retrieve transaction metadata | bearerAuth, dpopAuth |
| `GET` | `/metadata/standing-orders` | `getStandingOrderMetadata` | Retrieve standing order metadata | bearerAuth, dpopAuth |

## Business Financial Data Service API (`business-financial-data-service`)

- Contract: `openapi/business-financial-data-service.yaml`
- Version: `0.1.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.example.com/open-finance/v1/corporate`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `GET` | `/accounts` | `listCorporateAccounts` | List corporate accounts | bearerAuth, dpopAuth |
| `GET` | `/accounts/{masterAccountId}/balances` | `getCorporateBalances` | Retrieve balances | bearerAuth, dpopAuth |
| `GET` | `/transactions` | `getCorporateTransactions` | Retrieve transactions | bearerAuth, dpopAuth |

## Compliance Context Service API (`compliance-context`)

- Contract: `openapi/compliance-context.yaml`
- Version: `1.0.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/api/v1/compliance/screen` | `screenCompliance` | Run compliance screening | bearerAuth, dpopAuth |
| `GET` | `/api/v1/compliance/screenings/{transactionId}` | `findComplianceResult` | Find compliance result by transaction id | bearerAuth, dpopAuth |

## Confirmation of Payee Verification Service API (`confirmation-of-payee-service`)

- Contract: `openapi/confirmation-of-payee-service.yaml`
- Version: `0.1.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/confirmation-of-payee/confirmation` | `confirmPayee` | Verify payee details | dpopAuth, bearerAuth |

## Consent and Authorization Service API (`consent-authorization-service`)

- Contract: `openapi/consent-authorization-service.yaml`
- Version: `0.1.0`
- Security schemes: dpopAuth
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/consents` | `createConsent` | Create consent | dpopAuth |
| `GET` | `/consents` | `listConsents` | List consents by customer | dpopAuth |
| `GET` | `/consents/{ConsentId}` | `getConsent` | Retrieve consent | dpopAuth |
| `POST` | `/consents/{ConsentId}/authorize` | `authorizeConsent` | Authorize consent | dpopAuth |
| `PATCH` | `/consents/{ConsentId}/revoke` | `revokeConsent` | Revoke consent | dpopAuth |

## Customer Context Service API (`customer-context`)

- Contract: `openapi/customer-context.yaml`
- Version: `1.0.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/api/v1/customers` | `createCustomer` | Create customer | bearerAuth, dpopAuth |
| `GET` | `/api/v1/customers/{customerId}` | `getCustomer` | Get customer by id | bearerAuth, dpopAuth |
| `PUT` | `/api/v1/customers/{customerId}/credit-limit` | `updateCreditLimit` | Update customer credit limit | bearerAuth, dpopAuth |
| `POST` | `/api/v1/customers/{customerId}/credit/release` | `releaseCredit` | Release reserved credit | bearerAuth, dpopAuth |
| `POST` | `/api/v1/customers/{customerId}/credit/reserve` | `reserveCredit` | Reserve credit | bearerAuth, dpopAuth |

## Loan Context Service API (`loan-context`)

- Contract: `openapi/loan-context.yaml`
- Version: `1.0.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/api/v1/loans` | `createLoanApplication` | Create loan application | bearerAuth, dpopAuth |
| `GET` | `/api/v1/loans/{loanId}` | `getLoan` | Get loan by id | bearerAuth, dpopAuth |
| `POST` | `/api/v1/loans/{loanId}/approve` | `approveLoan` | Approve loan | bearerAuth, dpopAuth |
| `POST` | `/api/v1/loans/{loanId}/cancel` | `cancelLoan` | Cancel loan | bearerAuth, dpopAuth |
| `POST` | `/api/v1/loans/{loanId}/disburse` | `disburseLoan` | Disburse loan | bearerAuth, dpopAuth |
| `POST` | `/api/v1/loans/{loanId}/payments` | `makePayment` | Make loan payment | bearerAuth, dpopAuth |
| `POST` | `/api/v1/loans/{loanId}/reject` | `rejectLoan` | Reject loan | bearerAuth, dpopAuth |

## Open Finance Context Service API (`open-finance-context`)

- Contract: `openapi/open-finance-context.yaml`
- Version: `0.1.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae/open-finance`

No endpoints are currently declared in this contract.

## Open Products Catalog Service API (`open-products-service`)

- Contract: `openapi/open-products-service.yaml`
- Version: `0.1.0`
- Security schemes: public
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `GET` | `/products` | `listProducts` | List products | public |

## Payment Context Service API (`payment-context`)

- Contract: `openapi/payment-context.yaml`
- Version: `1.0.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/api/v1/payments` | `processPayment` | Process payment | bearerAuth, dpopAuth |
| `GET` | `/api/v1/payments/{paymentId}` | `getPayment` | Get payment by id | bearerAuth, dpopAuth |
| `POST` | `/api/v1/payments/{paymentId}/cancel` | `cancelPayment` | Cancel payment | bearerAuth, dpopAuth |
| `POST` | `/api/v1/payments/{paymentId}/confirm` | `confirmPayment` | Confirm payment | bearerAuth, dpopAuth |
| `POST` | `/api/v1/payments/{paymentId}/fail` | `failPayment` | Mark payment as failed | bearerAuth, dpopAuth |
| `POST` | `/api/v1/payments/{paymentId}/refund` | `refundPayment` | Refund payment | bearerAuth, dpopAuth |

## Personal Financial Data Service API (`personal-financial-data-service`)

- Contract: `openapi/personal-financial-data-service.yaml`
- Version: `0.1.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.example.com/open-finance/v1`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `GET` | `/accounts` | `listAccounts` | List accounts | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}` | `getAccount` | Retrieve account | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}/balances` | `getBalances` | Retrieve balances | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}/beneficiaries` | `getBeneficiaries` | Retrieve beneficiaries | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}/direct-debits` | `getDirectDebits` | Retrieve direct debits | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}/standing-orders` | `getStandingOrders` | Retrieve standing orders | bearerAuth, dpopAuth |
| `GET` | `/accounts/{AccountId}/transactions` | `getTransactions` | Retrieve transactions | bearerAuth, dpopAuth |

## Risk Context Service API (`risk-context`)

- Contract: `openapi/risk-context.yaml`
- Version: `1.0.0`
- Security schemes: bearerAuth, dpopAuth
- Server base URL: `https://api.sandbox.openfinance.ae`

| Method | Path | Operation ID | Summary | Effective Security |
|---|---|---|---|---|
| `POST` | `/api/v1/risk/assess` | `assessRisk` | Assess transaction risk | bearerAuth, dpopAuth |
| `GET` | `/api/v1/risk/assessments/{transactionId}` | `findRiskAssessment` | Find risk assessment by transaction id | bearerAuth, dpopAuth |

## Security Coverage Summary

- Protected contracts (Bearer + DPoP): `banking-metadata-service`, `business-financial-data-service`, `confirmation-of-payee-service`, `personal-financial-data-service`, `consent-authorization-service`, and bounded-context APIs.
- Public contracts: `atm-directory-service`, `open-products-service` (intended open-data exposure).
- Mandatory controls for protected APIs: mTLS at gateway, OAuth2/OIDC access token validation, DPoP proof validation, scope checks, rate limiting, structured audit logs.

> If runtime routes differ from this catalogue, update the relevant OpenAPI file first and regenerate this document as part of the same change set.
