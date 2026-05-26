-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BannerProduct" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BannerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BannerProduct_bannerId_idx" ON "BannerProduct"("bannerId");

-- CreateIndex
CREATE INDEX "BannerProduct_productId_idx" ON "BannerProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BannerProduct_bannerId_productId_key" ON "BannerProduct"("bannerId", "productId");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- AddForeignKey
ALTER TABLE "BannerProduct" ADD CONSTRAINT "BannerProduct_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerProduct" ADD CONSTRAINT "BannerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
