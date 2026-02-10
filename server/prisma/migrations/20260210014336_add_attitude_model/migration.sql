-- CreateTable
CREATE TABLE "attitudes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "strike" DOUBLE PRECISION NOT NULL,
    "dip" DOUBLE PRECISION NOT NULL,
    "dipDirection" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attitudes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "attitudes" ADD CONSTRAINT "attitudes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
