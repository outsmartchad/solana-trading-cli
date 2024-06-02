import { UmiPlugin } from '@metaplex-foundation/umi';
import {
  DataViewSerializerOptions,
  createDataViewSerializer,
} from './createDataViewSerializer';

export const dataViewSerializer = (
  options: DataViewSerializerOptions = {}
): UmiPlugin => ({
  install(umi) {
    umi.serializer = createDataViewSerializer(options);
  },
});
