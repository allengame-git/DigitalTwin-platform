-- CreateTable
CREATE TABLE "project_lithologies" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lithId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_lithologies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_lithologies_projectId_code_key" ON "project_lithologies"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "project_lithologies_projectId_lithId_key" ON "project_lithologies"("projectId", "lithId");

-- AddForeignKey
ALTER TABLE "project_lithologies" ADD CONSTRAINT "project_lithologies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
