const expect = require('expect')
const getDCOStatus = require('../lib/dco.js')

const success = JSON.stringify({state: 'success', description: 'All commits have a DCO sign-off from the author'})

describe('dco', () => {
  it('returns true if message contains signoff', () => {
    const commit = {
      message: 'Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  it('returns true for merge commit', () => {
    const commit = {
      message: 'mergin stuff',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: [1, 2]}])

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  it('returns error message if message does not have signoff', () => {
    const commit = {
      message: 'yolo',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'The sign-off is missing.',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns error message if the signoff does not match the author', () => {
    const commit = {
      message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'hiimbex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>" ',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns error message if the signoff does not match the email', () => {
    const commit = {
      message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'hiimbex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>" ',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns error message if the signoff does not match the author or email', () => {
    const commit = {
      message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>" ',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns error message if the first commit has no sign off but the second commit has a sign off', () => {
    const commitA = {
      message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const commitB = {
      message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit: commitA, parents: []}, {commit: commitB, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>" ',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns error message if the first commit has a sign off but the second commit does not have a sign off', () => {
    const commitA = {
      message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const commitB = {
      message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit: commitA, parents: []}, {commit: commitB, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>" ',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns success if all commits have sign off', () => {
    const commitA = {
      message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const commitB = {
      message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit: commitA, parents: []}, {commit: commitB, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  it('returns a 140 character description if the message is more than 140 characters', () => {
    const commit = {
      message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
      author: {
        name: 'bex is the best name ever and is also very long',
        email: 'bexMyVeryLongAlsoButImportantEmail@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'Expected "bex is the best name ever and is also very long <bexMyVeryLongAlsoButImportantEmail@disney.com>", but got "hiimbex <hiimbex@disney',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  it('returns success when casing in sign of message is different', () => {
    const commit = {
      message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@disney.com>',
      author: {
        name: 'hiimbex',
        email: 'hiimbex@disney.com'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  it('returns failure when email is invalid', () => {
    const commit = {
      message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex@bexo>',
      author: {
        name: 'hiimbex',
        email: 'hiimbex@bexo'
      }
    }
    const dcoObject = getDCOStatus([{commit, parents: []}])

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'hiimbex@bexo is not a valid email address.',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })
})
