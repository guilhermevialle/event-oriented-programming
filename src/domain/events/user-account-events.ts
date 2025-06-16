// src/domain/events/user-account-events.ts
import { DomainEvent, DomainEventProps, DomainEventType } from "./domain-event";

export interface UserAccountCreatedPayload {
  name: string;
  email: string;
}

export class CreatedUserAccountEvent extends DomainEvent<
  DomainEventType.USER_ACCOUNT_CREATED,
  UserAccountCreatedPayload
> {
  constructor(
    props: Omit<
      DomainEventProps<
        DomainEventType.USER_ACCOUNT_CREATED,
        UserAccountCreatedPayload
      >,
      "type"
    >
  ) {
    super({
      ...props,
      type: DomainEventType.USER_ACCOUNT_CREATED,
    });
  }
}
