import { getMetadataArgsStorage } from 'typeorm';
import { UserActivityEntity } from './user-activity.entity';
import { ActivityType } from '../enums/activity-type.enum';

describe('UserActivityEntity', () => {
  const metadata = getMetadataArgsStorage();

  it('defines required columns', () => {
    const columns = metadata.columns
      .filter((column) => column.target === UserActivityEntity)
      .map((column) => column.propertyName);

    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'activityType',
        'description',
        'ipAddress',
        'userAgent',
        'metadata',
        'createdAt',
      ]),
    );
  });

  it('enforces activity type enum', () => {
    const activityTypeColumn = metadata.columns.find(
      (column) =>
        column.target === UserActivityEntity &&
        column.propertyName === 'activityType',
    );
    const enumValues = Object.values(
      (activityTypeColumn?.options.enum ?? {}) as Record<string, string>,
    );

    expect(enumValues).toEqual(expect.arrayContaining(Object.values(ActivityType)));
  });

  it('has indexes for activity lookups and retention queries', () => {
    const indexNames = metadata.indices
      .filter((index) => index.target === UserActivityEntity)
      .map((index) => index.name);

    expect(indexNames).toEqual(
      expect.arrayContaining([
        'IDX_USER_ACTIVITY_USER_ID',
        'IDX_USER_ACTIVITY_ACTIVITY_TYPE',
        'IDX_USER_ACTIVITY_CREATED_AT',
        'IDX_USER_ACTIVITY_USER_TYPE_CREATED_AT',
      ]),
    );
  });
});
