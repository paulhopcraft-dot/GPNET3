exports.storage = {
  async getGPNet2Cases() {
    return [
      { id: 1, worker: "Jacob Gunn", status: "Active" },
      { id: 2, worker: "Stuart Barkley", status: "Inactive" }
    ];
  },

  async syncWorkerCaseFromFreshdesk(workerCase) {
    console.log("Synced worker case:", workerCase);
    return true;
  }
};
