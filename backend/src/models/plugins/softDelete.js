/**
 * Mongoose soft-delete plugin.
 * Adds `deletedAt` field and filters out deleted docs by default.
 * Use Model.findWithDeleted() / query.includeDeleted() to bypass filter.
 */
function softDeletePlugin(schema) {
  schema.add({
    deletedAt: { type: Date, default: null },
  });

  // Automatically exclude soft-deleted documents from all queries
  schema.pre(/^find/, function () {
    if (!this._includeDeleted) {
      this.where({ deletedAt: null });
    }
  });

  // Instance method: soft delete
  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  // Instance method: restore
  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
  };

  // Static: find including deleted
  schema.statics.findWithDeleted = function (filter = {}) {
    return this.find(filter).includeDeleted();
  };

  // Query helper to bypass the pre-find filter
  schema.query.includeDeleted = function () {
    this._includeDeleted = true;
    return this;
  };
}

module.exports = softDeletePlugin;
