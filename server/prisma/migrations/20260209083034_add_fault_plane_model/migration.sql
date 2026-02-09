-- CreateTable
CREATE TABLE "fault_planes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dipAngle" DOUBLE PRECISION NOT NULL,
    "dipDirection" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ff4444',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fault_coordinates" (
    "id" TEXT NOT NULL,
    "faultPlaneId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "fault_coordinates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fault_planes" ADD CONSTRAINT "fault_planes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fault_coordinates" ADD CONSTRAINT "fault_coordinates_faultPlaneId_fkey" FOREIGN KEY ("faultPlaneId") REFERENCES "fault_planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
