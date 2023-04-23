import Product from "../models/product.schema.js";
import Coupon from "../models/coupon.schema.js";
import Order from "../models/order.schema.js";
import asyncHandler from "../service/asyncHandler.js";
import CustomError from "../utils/customError.js";
/**********************************************************
 * @GENEARATE_RAZORPAY_ID
 * @route https://localhost:5000/api/order/razorpay
 * @description Controller used for genrating razorpay Id
 * @description Creates a Razorpay Id which is used for placing order
 * @returns Order Object with "Razorpay order id generated successfully"
 *********************************************************/

export const generateRazorpayOrderId = asyncHandler( async (req, res)=>{

    const { productId, couponCode } = req.body;
    if (!productId) {
        throw new CustomError("Product ID is required", 400);
    }
    
    // Verify product price from backend and get product info
    const product = await Product.findById(productId);
    if (!product) {
        throw new CustomError("Product not found", 404);
    }
    
    let totalAmount = product.price;
    let finalAmount = product.price;
    
    // Apply coupon code if provided
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            throw new CustomError("Invalid coupon code", 400);
        }
    
        // Calculate discount and final amount
        const discount = coupon.discount;
        totalAmount -= discount;
        finalAmount = totalAmount;
    }
    
    const options = {
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `receipt_${new Date().getTime()}`,
    };
    
    const order = await razorpay.orders.create(options);
    
    if (!order) {
        throw new CustomError("Could not generate Razorpay order ID", 500);
    }
    
  // Create new order object and save to database
  const newOrder = new Order({
    product: {
      productId: product._id,
      count: 1,
      price: product.price,
    },
    user: req.user._id,
    address: req.body.address,
    phoneNumber: req.body.phoneNumber,
    amount: finalAmount,
    coupon: couponCode || "",
    transactionId: order.id,
    status: "ORDERED",
  });

  await newOrder.save();

    res.status(200).json({
    success: true,
    message: "Razorpay order ID generated successfully",
    orderId: order.id,
    order: newOrder,
    });
    
})
