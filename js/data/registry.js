/* Sponsorship registry (mocked, hand-built) and simulated fraud list (appendix). */
(function () {
  'use strict';
  const A = window.Anchor;

  A.data.registry = {
    providers: { orbit: 'OrbitAI' },
    /* merchantId -> paid relationships with agent providers */
    relationships: [
      { merchantId: 'securelife', provider: 'OrbitAI', kind: 'commission', since: '2026-01-12', source: 'SecureLife distributor filing' },
      { merchantId: 'casekart', provider: 'OrbitAI', kind: 'affiliate', since: '2025-11-03', source: 'Affiliate network disclosure' },
      { merchantId: 'freshbasket', provider: 'OrbitAI', kind: 'sponsored', since: '2026-04-20', source: 'Retail media contract (public)' },
      { merchantId: 'quickloan', provider: 'OrbitAI', kind: 'commission', since: '2026-02-01', source: 'NBFC partner list' },
      { merchantId: 'battlezone', provider: 'OrbitAI', kind: 'affiliate', since: '2026-06-15', source: 'App-store referral programme' }
    ],
    /* merchants the registry covers completely — needed for a green with no disclosure (TC-E1) */
    fullCoverage: ['securelife', 'carefirst', 'healthnet', 'casekart', 'gadgethub', 'spigen', 'freshbasket', 'dailymart', 'minutes', 'greennest', 'kisancraft', 'indigo', 'airindia', 'urbanhelp', 'battlezone', 'nalli'],
    find(merchantId, provider) {
      return this.relationships.find((r) => r.merchantId === merchantId && (!provider || r.provider === provider));
    },
    covers(merchantId) { return this.fullCoverage.indexOf(merchantId) >= 0; }
  };

  /* 20 simulated payees flagged for fraud, incl. Suresh's scenario payee */
  const names = [
    ['acct-sbi-kyc-7781', 'SBI KYC Verification Desk', 14, '2026-10-26'],
    ['acct-rbi-refund-2210', 'RBI Refund Cell', 9, '2026-10-21'],
    ['acct-customs-parcel-551', 'Customs Parcel Clearance', 22, '2026-10-27'],
    ['acct-electricity-dues-90', 'BESCOM Dues Settlement', 31, '2026-10-25'],
    ['acct-cbi-digital-arrest', 'CBI Cyber Cell (Digital Arrest)', 47, '2026-10-28'],
    ['acct-lottery-kbc-19', 'KBC Lucky Draw Office', 18, '2026-10-19'],
    ['acct-job-advance-77', 'Amazon Work-from-Home Desk', 12, '2026-10-22'],
    ['acct-crypto-double-3', 'CryptoDouble Investments', 26, '2026-10-24'],
    ['acct-army-olx-41', 'Army Officer (OLX buyer)', 8, '2026-10-12'],
    ['acct-tax-refund-66', 'Income Tax Refund Desk', 15, '2026-10-20'],
    ['acct-sim-block-12', 'SIM Deactivation Centre', 11, '2026-10-18'],
    ['acct-insurance-bonus-5', 'Policy Bonus Release', 7, '2026-10-09'],
    ['acct-loan-app-instant', 'InstaCash Loan App', 19, '2026-10-26'],
    ['acct-gas-subsidy-8', 'Gas Subsidy Update', 6, '2026-10-05'],
    ['acct-courier-fedx-2', 'FedEx Drugs Parcel Desk', 21, '2026-10-23'],
    ['acct-matrimony-gift-4', 'Matrimony Gift Customs', 5, '2026-09-30'],
    ['acct-pm-scheme-31', 'PM Yojana Registration', 10, '2026-10-14'],
    ['acct-telegram-task-9', 'Telegram Task Earnings', 28, '2026-10-27'],
    ['acct-remote-support-6', 'AnyDesk Bank Support', 16, '2026-10-17'],
    ['acct-water-bill-13', 'Water Board Final Notice', 4, '2026-10-02']
  ];
  A.data.fraud = {
    list: names.map(([id, name, reports, last]) => ({ id, name, reports, lastReported: new Date(last).getTime() })),
    find(id) { return this.list.find((f) => f.id === id); }
  };
})();
