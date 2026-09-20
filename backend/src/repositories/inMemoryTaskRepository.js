function createInMemoryTaskRepository() {
  let tasks = [];
  let nextTaskId = 1;

  return {
    async listForUser(userId) {
      return tasks
        .filter((task) => task.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async create(taskData) {
      const task = {
        id: nextTaskId,
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      nextTaskId += 1;
      tasks.push(task);
      return task;
    },

    async update(id, userId, changes) {
      const task = tasks.find((item) => item.id === id && item.userId === userId);

      if (!task) {
        return null;
      }

      Object.assign(task, { updatedAt: new Date().toISOString() });

      Object.keys(changes).forEach((key) => {
        if (changes[key] !== undefined) {
          task[key] = changes[key];
        }
      });

      return task;
    },

    async remove(id, userId) {
      const index = tasks.findIndex((task) => task.id === id && task.userId === userId);

      if (index === -1) {
        return false;
      }

      tasks.splice(index, 1);
      return true;
    },
  };
}

module.exports = { createInMemoryTaskRepository };
