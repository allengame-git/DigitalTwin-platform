/**
 * FacilityModels — 場景模型群元件
 * 渲染目前場景中所有 FacilityModelItem
 */
import { useFacilityStore } from '@/stores/facilityStore';
import { FacilityModelItem } from './FacilityModelItem';

export function FacilityModels() {
    const models = useFacilityStore(state => state.models);

    if (models.length === 0) {
        return null;
    }

    return (
        <>
            {models.map(model => (
                <FacilityModelItem key={model.id} model={model} />
            ))}
        </>
    );
}

export default FacilityModels;
