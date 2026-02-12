-- CreateTable
CREATE TABLE "terrains" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "path" TEXT NOT NULL,
    "heightmap" TEXT NOT NULL,
    "texture" TEXT,
    "minX" DOUBLE PRECISION NOT NULL,
    "maxX" DOUBLE PRECISION NOT NULL,
    "minY" DOUBLE PRECISION NOT NULL,
    "maxY" DOUBLE PRECISION NOT NULL,
    "minZ" DOUBLE PRECISION NOT NULL,
    "maxZ" DOUBLE PRECISION NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terrains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terrains_filename_key" ON "terrains"("filename");

-- AddForeignKey
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
