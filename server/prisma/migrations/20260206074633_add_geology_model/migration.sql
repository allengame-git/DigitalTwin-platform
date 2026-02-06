-- CreateTable
CREATE TABLE "geophysics" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lineId" TEXT,
    "method" TEXT NOT NULL,
    "description" TEXT,
    "x1" DOUBLE PRECISION NOT NULL,
    "y1" DOUBLE PRECISION NOT NULL,
    "z1" DOUBLE PRECISION NOT NULL,
    "x2" DOUBLE PRECISION NOT NULL,
    "y2" DOUBLE PRECISION NOT NULL,
    "z2" DOUBLE PRECISION NOT NULL,
    "depthTop" DOUBLE PRECISION,
    "depthBottom" DOUBLE PRECISION,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geophysics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geology_models" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "version" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceData" TEXT,
    "cellSizeX" DOUBLE PRECISION,
    "cellSizeY" DOUBLE PRECISION,
    "cellSizeZ" DOUBLE PRECISION,
    "minX" DOUBLE PRECISION,
    "maxX" DOUBLE PRECISION,
    "minY" DOUBLE PRECISION,
    "maxY" DOUBLE PRECISION,
    "minZ" DOUBLE PRECISION,
    "maxZ" DOUBLE PRECISION,
    "tilesetUrl" TEXT,
    "size" INTEGER NOT NULL,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "conversionError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geology_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geophysics_filename_key" ON "geophysics"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "geology_models_filename_key" ON "geology_models"("filename");
