import React, { Component } from 'react'

export class Nav extends Component {

  render() {
    return (
      <div className='flex space-between items-center p-10 shadow-lg'>
        <h1 className='text-2xl font-bold text-white pr-9'>Project Manager</h1>
        <ul className='flex gap-9'>
            <li className='text-white'>Home</li>
            <li className='text-white'>Contact</li>
            <li className='text-white'>Login</li>
        </ul>
      </div>
    )
  }
}

export default Nav