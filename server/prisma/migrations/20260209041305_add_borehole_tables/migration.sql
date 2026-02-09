-- CreateTable
CREATE TABLE "boreholes" (
    "id" TEXT NOT NULL,
    "boreholeNo" TEXT NOT NULL,
    "name" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION NOT NULL,
    "totalDepth" DOUBLE PRECISION NOT NULL,
    "drilledDate" TIMESTAMP(3),
    "contractor" TEXT,
    "area" TEXT,
    "description" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boreholes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borehole_layers" (
    "id" TEXT NOT NULL,
    "boreholeId" TEXT NOT NULL,
    "topDepth" DOUBLE PRECISION NOT NULL,
    "bottomDepth" DOUBLE PRECISION NOT NULL,
    "lithologyCode" TEXT NOT NULL,
    "lithologyName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borehole_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borehole_properties" (
    "id" TEXT NOT NULL,
    "boreholeId" TEXT NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "nValue" INTEGER,
    "rqd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borehole_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borehole_photos" (
    "id" TEXT NOT NULL,
    "boreholeId" TEXT NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borehole_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boreholes_projectId_boreholeNo_key" ON "boreholes"("projectId", "boreholeNo");

-- AddForeignKey
ALTER TABLE "boreholes" ADD CONSTRAINT "boreholes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borehole_layers" ADD CONSTRAINT "borehole_layers_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borehole_properties" ADD CONSTRAINT "borehole_properties_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borehole_photos" ADD CONSTRAINT "borehole_photos_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
