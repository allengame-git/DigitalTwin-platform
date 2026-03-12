/**
 * Annotation Routes
 * 
 * CRUD endpoints for annotations.
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// In-memory store (replace with database in production)
interface Annotation {
    id: string;
    userId: string;
    userName: string;
    projectId: string;
    type: 'text' | 'arrow' | 'region';
    content: string;
    position: { x: number; y: number; z: number };
    cameraState: {
        position: { x: number; y: number; z: number };
        heading: number;
        pitch: number;
        roll: number;
    };
    createdAt: string;
    updatedAt: string;
    isResolved: boolean;
}

const annotations = new Map<string, Annotation>();

// Seed some demo data
function seedDemoAnnotations() {
    const demoAnnotations: Annotation[] = [
        {
            id: 'demo-1',
            userId: '2',
            userName: '審查委員 Demo',
            projectId: 'default',
            type: 'text',
            content: '此處地層剖面需要補充詳細描述',
            position: { x: 121.5654, y: 25.0330, z: 100 },
            cameraState: { position: { x: 0, y: 0, z: 500 }, heading: 0, pitch: -45, roll: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isResolved: false,
        },
        {
            id: 'demo-2',
            userId: '2',
            userName: '審查委員 Demo',
            projectId: 'default',
            type: 'arrow',
            content: '建議增加此區域的地質調查點位',
            position: { x: 121.5700, y: 25.0350, z: 80 },
            cameraState: { position: { x: 100, y: 100, z: 400 }, heading: 30, pitch: -30, roll: 0 },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
            isResolved: true,
        },
    ];

    demoAnnotations.forEach((a) => annotations.set(a.id, a));
}

seedDemoAnnotations();

/**
 * GET /annotations
 * Get all annotations for a project
 */
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
    const projectId = (req.query.projectId as string) || 'default';

    const projectAnnotations = Array.from(annotations.values())
        .filter((a) => a.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
        annotations: projectAnnotations,
        total: projectAnnotations.length,
    });
});

/**
 * GET /annotations/:id
 * Get a single annotation
 */
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const annotation = annotations.get(id);

    if (!annotation) {
        res.status(404).json({ message: '標註不存在' });
        return;
    }

    res.json(annotation);
});

/**
 * POST /annotations
 * Create a new annotation (viewers/engineers)
 */
router.post(
    '/',
    authenticate,
    authorize('viewer', 'engineer'),
    (req: AuthenticatedRequest, res: Response) => {
        const { projectId, type, content, position, cameraState } = req.body;

        if (!type || !content || !position || !cameraState) {
            res.status(400).json({ message: '缺少必要欄位' });
            return;
        }

        const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date().toISOString();

        const annotation: Annotation = {
            id,
            userId: req.user!.userId,
            userName: req.user!.email.split('@')[0], // Simplified; use actual name in production
            projectId: projectId || 'default',
            type,
            content,
            position,
            cameraState,
            createdAt: now,
            updatedAt: now,
            isResolved: false,
        };

        annotations.set(id, annotation);
        res.status(201).json(annotation);
    }
);

/**
 * PATCH /annotations/:id
 * Update an annotation
 */
router.patch(
    '/:id',
    authenticate,
    authorize('viewer', 'engineer'),
    (req: AuthenticatedRequest, res: Response) => {
        const id = req.params.id as string;
        const annotation = annotations.get(id);

        if (!annotation) {
            res.status(404).json({ message: '標註不存在' });
            return;
        }

        const { content, isResolved } = req.body;
        const now = new Date().toISOString();

        if (content !== undefined) annotation.content = content;
        if (isResolved !== undefined) annotation.isResolved = isResolved;
        annotation.updatedAt = now;

        annotations.set(id, annotation);
        res.json(annotation);
    }
);

/**
 * DELETE /annotations/:id
 * Delete an annotation
 */
router.delete(
    '/:id',
    authenticate,
    authorize('viewer', 'engineer'),
    (req: AuthenticatedRequest, res: Response) => {
        const id = req.params.id as string;
        const annotation = annotations.get(id);

        if (!annotation) {
            res.status(404).json({ message: '標註不存在' });
            return;
        }

        annotations.delete(id);
        res.status(204).send();
    }
);

export default router;
