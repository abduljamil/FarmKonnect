const Product = require("../../models/Product");
const BaseRepository = require("../base");

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  async findByCategory(category) {
    return await this.model
      .find({ category, status: "active" })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
  }

  async findBySeller(sellerId) {
    return await this.model.find({ seller: sellerId }).sort({ createdAt: -1 });
  }

  async searchProducts(searchTerm) {
    return await this.model
      .find({
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
        status: "active",
      })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
  }

  async findByPriceRange(minPrice, maxPrice) {
    return await this.model
      .find({
        price: { $gte: minPrice, $lte: maxPrice },
        status: "active",
      })
      .populate("seller", "name email")
      .sort({ price: 1 });
  }

  async updateStatus(productId, status) {
    return await this.model.findByIdAndUpdate(
      productId,
      { status, updatedAt: Date.now() },
      { new: true }
    );
  }
}

module.exports = new ProductRepository();
