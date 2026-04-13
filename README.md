# Finbo - Privacy-First Financial Assistant

Finbo is a personal finance web app designed to help users track money across budgets, bills, loans, savings goals, accounts, and analytics. It focuses on clarity, security, and practical day-to-day money management.

## Features

- **Dashboard Overview**: See balances, progress, and key financial metrics at a glance.
- **Budget Tracking**: Track spending against monthly budgets and monitor remaining amounts.
- **Bills Management**: Organize bills, mark them paid, and keep recurring obligations visible.
- **Loans Tracking**: Follow outstanding balances and repayment progress.
- **Savings Goals**: Set goals and watch savings progress over time.
- **Analytics**: Review income and spending patterns with charts and summaries.
- **Security Tools**: Protect access with PIN-based locking and privacy-focused local security settings.
- **Backup and Support**: Export or back up data and access the support page for the app.

## Premium Features

Premium features will include an AI-powered chatbot, built with a privacy-first approach so user data is handled carefully and only when needed.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Finbo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

Start the application:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

## Docker

Build and run the production container:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

If you prefer plain Docker:

```bash
docker build -t finbo .
docker run --rm -p 3000:80 finbo
```

## Development

### Running Tests

To run the test suite:
```bash
npm test
```

### Code Style

The project uses ESLint for code quality checks:
```bash
npm run lint
```
