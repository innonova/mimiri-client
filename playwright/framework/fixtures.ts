import { expect as baseExpect } from '@playwright/test'
import { differenceInDays, differenceInHours, differenceInMinutes, isBefore } from 'date-fns'

export { test } from '@playwright/test'

export const expect = baseExpect.extend({
  toBeBetween(value: number, lower: number, upper: number) {
    const assertionName = 'toBeBetween'
    const pass = value >= lower && value <= upper

    const message = () =>
      this.utils.matcherHint(assertionName, value, `${lower}, ${upper}`, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`${lower} <= value <= ${upper}`)}\n` +
      `Received: ${this.utils.printReceived(value)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `${lower} < value < ${upper}`,
      actual: value,
    }
  },

  toBeBeforeNow(value: Date) {
    const assertionName = 'toBeBeforeNow'
    const pass = isBefore(value, new Date())

    const message = () =>
      this.utils.matcherHint(assertionName, value.toISOString(), new Date().toISOString(), {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`value < ${new Date()}`)}\n` +
      `Received: ${this.utils.printReceived(`${value}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },

  toBeInHours(value: Date, hours: number, now: Date = new Date()) {
    const assertionName = 'toBeInHours'
    const minutes = differenceInMinutes(value, now)
    const pass = minutes >= hours * 60 - 5 && minutes <= hours * 60

    // console.log(
    //   `hours(${hours}): minutes difference to be ${hours * 60 - 5} <= ${minutes} <= ${hours * 60}`,
    // )

    const message = () =>
      this.utils.matcherHint(
        assertionName,
        value.toISOString(),
        `${hours} hours from ${now.toISOString()}`,
        {
          isNot: this.isNot,
        },
      ) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`minutes difference to be ${hours * 60 - 5} <= value <= ${hours * 60}`)}\n` +
      `Received: ${this.utils.printReceived(`${minutes}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },

  toBeInDays(value: Date, days: number, now: Date = new Date()) {
    const assertionName = 'toBeInDays'
    const hours = differenceInHours(value, now)
    const pass = hours >= days * 24 - 2 && hours <= days * 24

    // console.log(
    //   `days(${days}): hours difference to be ${days * 24 - 2} <= ${hours} <= ${days * 24}`,
    // )

    const message = () =>
      this.utils.matcherHint(
        assertionName,
        value.toISOString(),
        `${days} days from ${now.toISOString()}`,
        {
          isNot: this.isNot,
        },
      ) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`hours difference to be ${days * 24 - 2} <= value <= ${days * 24}`)}\n` +
      `Received: ${this.utils.printReceived(`${hours}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },

  toBeInWeeks(value: Date, weeks: number, now: Date = new Date()) {
    const assertionName = 'toBeInWeeks'
    const days = differenceInDays(value, now)
    const pass = days >= weeks * 7 - 1 && days <= weeks * 7

    // console.log(
    //   `weeks(${weeks}): days difference to be ${weeks * 7 - 1} <= ${days} <= ${weeks * 7}`,
    // )

    const message = () =>
      this.utils.matcherHint(
        assertionName,
        value.toISOString(),
        `${weeks} weeks from ${now.toISOString()}`,
        {
          isNot: this.isNot,
        },
      ) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`days difference to be ${weeks * 7 - 1} <= value <= ${weeks * 7}`)}\n` +
      `Received: ${this.utils.printReceived(`${days}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },

  toBeInMonths(value: Date, months: number, now: Date = new Date()) {
    const assertionName = 'toBeInMonths'
    const days = differenceInDays(value, now)
    const pass = days >= months * 30 - 3 && days <= months * 31

    // console.log(
    //   `months(${months}): days difference to be ${months * 30 - 3} <= ${days} <= ${months * 31}`,
    // )

    const message = () =>
      this.utils.matcherHint(assertionName, value.toISOString(), months, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`days difference to be ${months * 30 - 3} <= value <= ${months * 31}`)}\n` +
      `Received: ${this.utils.printReceived(`${days}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },

  toBeInYears(value: Date, years: number, now: Date = new Date()) {
    const assertionName = 'toBeInYears'
    const days = differenceInDays(value, now)
    const pass = days >= years * 365 - 5 && days <= years * 366

    // console.log(
    //   `years(${years}): days difference to be ${years * 365 - 5} <= ${days} <= ${years * 366}`,
    // )

    const message = () =>
      this.utils.matcherHint(assertionName, value.toISOString(), years, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(`days difference to be ${years * 365 - 5} <= value <= ${years * 366}`)}\n` +
      `Received: ${this.utils.printReceived(`${days}`)}`

    return {
      message,
      pass,
      name: assertionName,
      expected: `value < ${new Date()}`,
      actual: value,
    }
  },
})
