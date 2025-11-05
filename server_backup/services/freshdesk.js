class FreshdeskService {
  async fetchTickets() {
    console.log("[freshdesk] fetching tickets (mock)");
    return [
      { id: 1, subject: "Example ticket A" },
      { id: 2, subject: "Example ticket B" }
    ];
  }

  async transformTicketsToWorkerCases(tickets) {
    console.log("[freshdesk] transforming tickets (mock)");
    return tickets.map(t => ({
      id: t.id,
      worker: t.subject,
      status: "Active"
    }));
  }
}

exports.FreshdeskService = FreshdeskService;
