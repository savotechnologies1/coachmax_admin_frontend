import { useForm } from "react-hook-form";
import { Modal } from "../ui/modal";
import { useUpdatePlayerStatistics, useUpdateTeamPlayerStatistics } from "../../hooks/usePlayers";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useEffect } from "react";

interface EditPlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  teamId?: string;
  initialStats: {
    appearances?: number;
    goals?: number;
    assists?: number;
    cleanSheets?: number;
    yellowCards?: number;
    redCards?: number;
    minutesPlayed?: number;
  };
}

interface StatsFormValues {
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

export default function EditPlayerStatsModal({
  isOpen,
  onClose,
  playerId,
  playerName,
  teamId,
  initialStats,
}: EditPlayerStatsModalProps) {
  const { mutateAsync: updateStats, isPending: isUpdatingGeneralStats } = useUpdatePlayerStatistics();
  const { mutateAsync: updateTeamStats, isPending: isUpdatingTeamStats } = useUpdateTeamPlayerStatistics(teamId || "");
  const isPending = teamId ? isUpdatingTeamStats : isUpdatingGeneralStats;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StatsFormValues>({
    defaultValues: {
      appearances: initialStats.appearances || 0,
      goals: initialStats.goals || 0,
      assists: initialStats.assists || 0,
      cleanSheets: initialStats.cleanSheets || 0,
      yellowCards: initialStats.yellowCards || 0,
      redCards: initialStats.redCards || 0,
      minutesPlayed: initialStats.minutesPlayed || 0,
    },
  });

  // Reset form values when initialStats changes or modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        appearances: initialStats.appearances || 0,
        goals: initialStats.goals || 0,
        assists: initialStats.assists || 0,
        cleanSheets: initialStats.cleanSheets || 0,
        yellowCards: initialStats.yellowCards || 0,
        redCards: initialStats.redCards || 0,
        minutesPlayed: initialStats.minutesPlayed || 0,
      });
    }
  }, [isOpen, initialStats, reset]);

  const onSubmit = async (values: StatsFormValues) => {
    try {
      // Cast input values to numbers
      const payload = {
        appearances: Number(values.appearances),
        goals: Number(values.goals),
        assists: Number(values.assists),
        cleanSheets: Number(values.cleanSheets),
        yellowCards: Number(values.yellowCards),
        redCards: Number(values.redCards),
        minutesPlayed: Number(values.minutesPlayed),
      };

      if (teamId) {
        await updateTeamStats({ playerId, data: payload });
      } else {
        await updateStats({ playerId, data: payload });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save statistics:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[500px] p-6 lg:p-8 rounded-none shadow-2xl"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Update Statistics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Editing performance metrics for <span className="font-semibold text-slate-700 dark:text-slate-200">{playerName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Appearances</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("appearances", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.appearances}
                hint={errors.appearances?.message}
              />
            </div>

            <div>
              <Label>Goals</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("goals", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.goals}
                hint={errors.goals?.message}
              />
            </div>

            <div>
              <Label>Assists</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("assists", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.assists}
                hint={errors.assists?.message}
              />
            </div>

            <div>
              <Label>Clean Sheets</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("cleanSheets", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.cleanSheets}
                hint={errors.cleanSheets?.message}
              />
            </div>

            <div>
              <Label>Yellow Cards</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("yellowCards", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.yellowCards}
                hint={errors.yellowCards?.message}
              />
            </div>

            <div>
              <Label>Red Cards</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("redCards", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.redCards}
                hint={errors.redCards?.message}
              />
            </div>

            <div className="col-span-2">
              <Label>Minutes Played</Label>
              <Input
                type="number"
                placeholder="0"
                {...register("minutesPlayed", {
                  required: "Required",
                  min: { value: 0, message: "Min 0" },
                })}
                error={!!errors.minutesPlayed}
                hint={errors.minutesPlayed?.message}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#0047FF] hover:bg-blue-700 text-white rounded-none"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
