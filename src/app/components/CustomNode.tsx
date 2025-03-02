import React from 'react';
import { Position, Handle, NodeProps } from 'reactflow';

type CustomNodeData = {
    id: number;
    name: string;
    position: { x: number; y: number };
    isStart?: boolean;
    isEnd?: boolean;
    active?: boolean;
};

const CustomNode = ({ data, selected }: NodeProps<CustomNodeData>) => {
    return (
        <div
            className={`relative flex flex-col items-center justify-center pt-6 pb-4 px-4 rounded-b-md shadow-md border h-[80px]
        ${data.isStart ? 'bg-green-50 border-green-400' : data.isEnd ? 'bg-red-50 border-red-400' : 'bg-white border-gray-300'}
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
            style={{ minWidth: 140 }}
        >
            {data.isStart && (
                <div
                    className="
          absolute
          top-0
          left-11
          transform
          -translate-x-1/2
          -translate-y-full
          text-green-700
          border
          bg-green-50
          border-green-400
          text-xs
          pt-1
          font-bold
          rounded-t-md
          h-8
          w-[89px]
          text-center
          "
                >
                    Starting State
                </div>
            )}

            {data.isEnd && (
                <div
                    className="
          absolute
          top-0
          left-11
          transform
          -translate-x-1/2
          -translate-y-full
          text-gray-600
          border
          bg-red-50
          border-red-400
          text-xs
          font-bold
          pt-1
          rounded-t-md
          shadow
          h-8
          w-[89px]
          text-center
          "
                >
                    Ending State
                </div>
            )}

            <div className="font-bold text-gray-700 mb-2 text-sm">{data.name}</div>

            <Handle
                type="target"
                position={Position.Left}
                style={{
                    top: '50%',
                    background: '#4B5563',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid #E5E7EB',
                    transform: 'translate(-50%, -50%)',
                }}
            />

            <Handle
                type="source"
                position={Position.Right}
                style={{
                    top: '50%',
                    background: '#3B82F6',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid #E5E7EB',
                    transform: 'translate(50%, -50%)',
                }}
            />

            {data.active && (
                <div className="absolute bottom-4 right-[-40px] transform -translate-x-1/2 translate-y-full text-gray-600 border bg-orange-200 border-orange-300 text-xs font-bold rounded shadow px-1 py-[2px]">
                    Active
                </div>
            )}
        </div>
    );
};

export default CustomNode;
